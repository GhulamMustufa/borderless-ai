import "dotenv/config";
import { Pool } from "pg";
import * as cheerio from "cheerio";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
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

interface VisaEntry {
  Country: string;
  Pathway: string;
  URL: string;
}

const INPUT_CSV = path.join(process.cwd(), "country_visa_clean.csv");

// Using a simple delay to throttle API requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function urlExistsInDB(url: string): Promise<boolean> {
  const result = await pool.query(`SELECT 1 FROM immigration_evidence WHERE source_url = $1 LIMIT 1`, [url]);
  return (result.rowCount ?? 0) > 0;
}

async function fetchAndCleanHTML(url: string): Promise<string> {
  const response = await safeFetchGovernmentUrl(url, { timeoutMs: 10000 });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  
  const html = await response.text();
  const $ = cheerio.load(html);
  
  // Remove non-content elements to save tokens
  $('script, style, nav, footer, header, iframe, noscript, svg, path, .sidebar, .nav, .menu').remove();
  
  const cleanText = $('body').text().replace(/\s+/g, ' ').trim();
  return cleanText;
}

async function processWithLLM(rawText: string, url: string, country: string, pathway: string): Promise<any> {
  const prompt = `
You are an expert immigration data extraction system.
I will give you the raw text scraped from an official government immigration webpage for the country "${country}" and the visa pathway "${pathway}".
Your job is to read it carefully and extract the core eligibility rules into a clean Markdown format.

URL: ${url}

Raw Text:
"""
${rawText.slice(0, 15000)} // Truncate if insanely long to fit in context
"""

Extract the following in JSON format:
{
  "country": "The country this visa is for (should be ${country})",
  "pathway": "The exact name of the visa or pathway (should be ${pathway})",
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
  return result;
}

async function generateEmbedding(text: string): Promise<number[]> {
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
}

async function run() {
  console.log(`\n🚀 Starting Batch Scraper for ${INPUT_CSV}\n`);

  const entries: VisaEntry[] = [];
  
  // 1. Read CSV
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(INPUT_CSV)
      .pipe(csv())
      .on("data", (data: VisaEntry) => entries.push(data))
      .on("end", () => resolve())
      .on("error", (error) => reject(error));
  });

  console.log(`📊 Found ${entries.length} URLs to process.`);

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    console.log(`\n[${i + 1}/${entries.length}] Processing: ${entry.Country} | ${entry.Pathway}`);
    console.log(`URL: ${entry.URL}`);

    try {
      // 2. Check if already scraped
      const isScraped = await urlExistsInDB(entry.URL);
      if (isScraped) {
        console.log(`⏩ Skipping - URL already exists in database.`);
        skipCount++;
        continue;
      }

      // 3. Scrape and process
      console.log(`   - Fetching HTML...`);
      const rawText = await fetchAndCleanHTML(entry.URL);
      
      console.log(`   - Extracting via GPT-4o-mini... (${rawText.length} chars)`);
      const extractedData = await processWithLLM(rawText, entry.URL, entry.Country, entry.Pathway);
      
      console.log(`   - Generating Embedding...`);
      const embedding = await generateEmbedding(extractedData.markdown_content);
      
      console.log(`   - Saving to DB...`);
      await saveToDatabase(extractedData, entry.URL, embedding);
      
      console.log(`✅ Success!`);
      successCount++;
      
    } catch (err: any) {
      console.error(`❌ Failed: ${err.message}`);
      failCount++;
    }

    // Small delay to respect rate limits
    await delay(1000);
  }

  console.log(`\n🎉 Batch Scrape Complete!`);
  console.log(`✅ Success: ${successCount} | ⏩ Skipped: ${skipCount} | ❌ Failed: ${failCount}\n`);
  
  await pool.end();
}

run().catch(console.error);
