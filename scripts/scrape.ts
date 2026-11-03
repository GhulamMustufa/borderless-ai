import { Pool } from "pg";
import * as cheerio from "cheerio";
import crypto from "crypto";
import { safeFetchGovernmentUrl } from "../lib/safe-fetch";

// We require OPENAI_API_KEY and DATABASE_URL in the environment
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing");
if (!DATABASE_URL) throw new Error("DATABASE_URL missing");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

async function fetchAndCleanHTML(url: string): Promise<string> {
  console.log(`\n1. Fetching URL: ${url}`);
  const response = await safeFetchGovernmentUrl(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  
  const html = await response.text();
  const $ = cheerio.load(html);
  
  // Remove non-content elements to save tokens
  $('script, style, nav, footer, header, iframe, noscript, svg, path, .sidebar, .nav, .menu').remove();
  
  const cleanText = $('body').text().replace(/\s+/g, ' ').trim();
  console.log(`✅ Extracted ${cleanText.length} characters of raw text.`);
  return cleanText;
}

async function processWithLLM(rawText: string, url: string): Promise<any> {
  console.log(`2. Sending text to GPT-4o-mini for processing...`);
  const prompt = `
You are an expert immigration data extraction system.
I will give you the raw text scraped from an official government immigration webpage.
Your job is to read it carefully and extract the core eligibility rules into a clean Markdown format.

URL: ${url}

Raw Text:
"""
${rawText.slice(0, 15000)} // Truncate if insanely long to fit in context
"""

Extract the following in JSON format:
{
  "country": "The country this visa is for",
  "pathway": "The exact name of the visa or pathway",
  "claim_type": "The category of rule (e.g. 'points_requirements', 'salary_threshold', 'language_requirements', or 'general_eligibility')",
  "source_title": "A short, descriptive title for the webpage",
  "markdown_content": "A beautifully formatted Markdown string outlining exactly what is required to qualify. Use bullet points. Do not omit any hard numbers (like salary minimums, age limits, or points required)."
}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI Chat API error: ${await res.text()}`);
  }

  const data = await res.json();
  const result = JSON.parse(data.choices[0].message.content);
  console.log(`✅ LLM Processed: ${result.pathway} in ${result.country}`);
  return result;
}

async function generateEmbedding(text: string): Promise<number[]> {
  console.log(`3. Generating vector embedding...`);
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      input: text,
      model: "text-embedding-3-small",
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI Embedding API error: ${await res.text()}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

async function saveToDatabase(extractedData: any, url: string, embedding: number[]) {
  console.log(`4. Saving to Neon Database...`);
  
  const source_id = `scrape-${crypto.randomBytes(4).toString('hex')}`;
  const content_hash = crypto.createHash('sha256').update(extractedData.markdown_content).digest('hex');
  const embeddingStr = `[${embedding.join(',')}]`;
  
  await pool.query(
    `INSERT INTO immigration_evidence 
      (source_id, authority_tier, country, jurisdiction, pathway, claim_type, source_url, source_title, verification_status, content, content_hash, embedding)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      source_id, 
      5, // Unverified new scrapes must be Tier 5 pending human review
      extractedData.country, 
      "National", 
      extractedData.pathway, 
      extractedData.claim_type, 
      url, 
      extractedData.source_title, 
      "QUARANTINED", // Marked QUARANTINED until human review
      extractedData.markdown_content, 
      content_hash, 
      embeddingStr
    ]
  );
  console.log(`✅ Successfully saved evidence ID: ${source_id} to database!`);
}

async function run() {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: npx tsx scripts/scrape.ts <URL>");
    process.exit(1);
  }

  try {
    const rawText = await fetchAndCleanHTML(url);
    const extractedData = await processWithLLM(rawText, url);
    const embedding = await generateEmbedding(extractedData.markdown_content);
    await saveToDatabase(extractedData, url, embedding);
  } catch (error) {
    console.error("❌ Scraping failed:", error);
  } finally {
    await pool.end();
  }
}

run();
