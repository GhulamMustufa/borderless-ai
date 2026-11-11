-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create immigration_evidence table
CREATE TABLE IF NOT EXISTS immigration_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id TEXT UNIQUE NOT NULL,
    authority_tier INTEGER NOT NULL,
    country TEXT NOT NULL,
    jurisdiction TEXT,
    pathway TEXT,
    claim_type TEXT NOT NULL,
    effective_from TIMESTAMP WITH TIME ZONE,
    effective_until TIMESTAMP WITH TIME ZONE,
    retrieved_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    source_url TEXT NOT NULL,
    source_title TEXT NOT NULL,
    verification_status TEXT NOT NULL,
    human_reviewed_at TIMESTAMP WITH TIME ZONE,
    human_reviewed_by TEXT,
    content TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create visa_submissions table to store assessment results
CREATE TABLE IF NOT EXISTS visa_submissions (
    id SERIAL PRIMARY KEY,
    request_id TEXT NOT NULL,
    ip TEXT,
    user_id TEXT, -- Clerk user ID
    prompt_version TEXT,
    model TEXT,
    profile JSONB NOT NULL,
    sources JSONB NOT NULL,
    response JSONB NOT NULL,
    latency_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user_subscriptions table 
CREATE TABLE IF NOT EXISTS user_subscriptions (
    user_id TEXT PRIMARY KEY, -- Clerk user ID
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan TEXT DEFAULT 'free',
    status TEXT DEFAULT 'active',
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create chat_threads and chat_messages tables (Migration 002)
CREATE TABLE IF NOT EXISTS chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS chat_threads_user_idx ON chat_threads(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_thread_idx ON chat_messages(thread_id, created_at ASC);

-- Create index on embeddings for fast retrieval
CREATE INDEX IF NOT EXISTS immigration_evidence_embedding_idx ON immigration_evidence USING hnsw (embedding vector_cosine_ops);

-- Create partial index for fast retrieval of verified and human-reviewed evidence
CREATE INDEX IF NOT EXISTS immigration_evidence_human_review_idx 
ON immigration_evidence (verification_status, human_reviewed_at) 
WHERE verification_status = 'VERIFIED' 
  AND human_reviewed_at IS NOT NULL 
  AND human_reviewed_by IS NOT NULL 
  AND human_reviewed_by !~ '^[[:space:]]*$'
  AND authority_tier BETWEEN 1 AND 3;

-- Create match_evidence_v2 function
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
        -- 1. Mandatory Human-Review Gate
        e.verification_status = 'VERIFIED'
        AND e.human_reviewed_at IS NOT NULL
        AND e.human_reviewed_at <= NOW()
        AND e.human_reviewed_by IS NOT NULL
        AND e.human_reviewed_by !~ '^[[:space:]]*$'
        
        -- 2. Authority Tier Gating
        AND e.authority_tier BETWEEN 1 AND 3

        -- 3. Temporal Validity Policy
        AND (e.effective_until IS NULL OR e.effective_until >= NOW())
        AND (e.effective_from IS NULL OR e.effective_from <= NOW())
        AND (e.effective_until IS NOT NULL OR e.human_reviewed_at >= NOW() - INTERVAL '180 days')

        -- 4. Mandatory Country Filter (Guarantees zero cross-country fallthrough)
        AND e.country = ANY(filter_countries)

        -- 5. Pathway Filter
        AND (filter_pathway IS NULL OR e.pathway = filter_pathway)

        -- 6. Vector Similarity Threshold
        AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY
        e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Least-Privilege Execution Permissions
REVOKE EXECUTE ON FUNCTION match_evidence_v2(vector, float8, int4, text[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION match_evidence_v2(vector, float8, int4, text[], text) TO CURRENT_USER;



