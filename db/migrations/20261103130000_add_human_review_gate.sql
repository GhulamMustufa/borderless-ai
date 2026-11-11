-- Migration: 20261103130000_add_human_review_gate.sql
-- Description: Establishes a mandatory human-review gate, temporal validity, and versioned match_evidence_v2.
-- Architecture Decision: Option B (Versioned function match_evidence_v2) chosen to prevent zero-downtime
-- catalog lock errors. In PostgreSQL, ALTER/CREATE OR REPLACE FUNCTION cannot modify the return type
-- of an existing function. Dropping the active function (Option A) introduces race conditions for in-flight
-- queries. match_evidence_v2 ensures 100% transaction safety and non-breaking deployment.
--
-- IMPORTANT: DO NOT EXECUTE DIRECTLY WITHOUT EXPLICIT OPERATIONAL SIGN-OFF.

BEGIN;

-- 1. Add human verification tracking columns to immigration_evidence
ALTER TABLE IF EXISTS immigration_evidence
    ADD COLUMN IF NOT EXISTS human_reviewed_at TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS human_reviewed_by TEXT DEFAULT NULL;

-- 2. Partial index for fast retrieval of verified and human-reviewed evidence
CREATE INDEX IF NOT EXISTS immigration_evidence_human_review_idx 
ON immigration_evidence (verification_status, human_reviewed_at) 
WHERE verification_status = 'VERIFIED' 
  AND human_reviewed_at IS NOT NULL 
  AND human_reviewed_by IS NOT NULL 
  AND human_reviewed_by !~ '^[[:space:]]*$'
  AND authority_tier BETWEEN 1 AND 3;

-- 3. Versioned evidence retrieval function: match_evidence_v2
-- Preserves canonical column order (1-16) from original schema and appends human review columns (17, 18).
-- Requires mandatory, non-empty multi-country array filtering (e.g. ['Australia', 'New Zealand']).
CREATE OR REPLACE FUNCTION match_evidence_v2(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    filter_countries text[],
    filter_pathway text DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    source_id TEXT,
    authority_tier INTEGER,
    country TEXT,
    jurisdiction TEXT,
    pathway TEXT,
    claim_type TEXT,
    effective_from TIMESTAMPTZ,
    effective_until TIMESTAMPTZ,
    retrieved_at TIMESTAMPTZ,
    source_url TEXT,
    source_title TEXT,
    verification_status TEXT,
    content_hash TEXT,
    content TEXT,
    similarity float,
    human_reviewed_at TIMESTAMPTZ,
    human_reviewed_by TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    -- Enforce mandatory, non-empty country array to prevent unrestricted cross-country leakage
    IF filter_countries IS NULL OR cardinality(filter_countries) = 0 THEN
        RAISE EXCEPTION 'filter_countries must be a non-empty array of canonical countries';
    END IF;

    RETURN QUERY
    SELECT
        e.id,
        e.source_id,
        e.authority_tier,
        e.country,
        e.jurisdiction,
        e.pathway,
        e.claim_type,
        e.effective_from,
        e.effective_until,
        e.retrieved_at,
        e.source_url,
        e.source_title,
        e.verification_status,
        e.content_hash,
        e.content,
        1 - (e.embedding <=> query_embedding) AS similarity,
        e.human_reviewed_at,
        e.human_reviewed_by
    FROM
        immigration_evidence e
    WHERE
        -- 1. Mandatory Human-Review Gate:
        -- Status must be explicitly VERIFIED and have non-null, non-empty, non-whitespace auditor metadata
        e.verification_status = 'VERIFIED'
        AND e.human_reviewed_at IS NOT NULL
        AND e.human_reviewed_at <= NOW()
        AND e.human_reviewed_by IS NOT NULL
        AND e.human_reviewed_by !~ '^[[:space:]]*$'
        
        -- 2. Authority Tier Gating:
        -- Exclude Tier 4 (media/unverified) and Tier 5 (aggregators/crowdsourced)
        AND e.authority_tier BETWEEN 1 AND 3

        -- 3. Temporal Validity Policy:
        -- Expired rules must be rejected
        AND (e.effective_until IS NULL OR e.effective_until >= NOW())
        -- Future rules not yet in force must be rejected
        AND (e.effective_from IS NULL OR e.effective_from <= NOW())
        -- Conservative currency horizon for undated evidence:
        -- If no sunset clause is codified, human review must have occurred within 180 days
        AND (e.effective_until IS NOT NULL OR e.human_reviewed_at >= NOW() - INTERVAL '180 days')

        -- 4. Mandatory Country Filter (Guarantees zero cross-country fallthrough):
        AND e.country = ANY(filter_countries)

        -- 5. Pathway Filter:
        AND (filter_pathway IS NULL OR e.pathway = filter_pathway)

        -- 6. Vector Similarity Threshold:
        AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY
        e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 4. Least-Privilege Execution Permissions:
-- Revoke public execution to prevent unauthorized role access
REVOKE EXECUTE ON FUNCTION match_evidence_v2(vector, float8, int4, text[], text) FROM PUBLIC;

-- Explicitly grant execution to CURRENT_USER (connection role executing migration)
GRANT EXECUTE ON FUNCTION match_evidence_v2(vector, float8, int4, text[], text) TO CURRENT_USER;

COMMIT;

