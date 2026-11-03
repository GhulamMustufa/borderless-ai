import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { Pool } from 'pg';
import { auth } from '@clerk/nextjs/server';
import {
  listUserThreads,
  getOrCreateThread,
  getThreadMessages,
  saveChatMessage,
} from '@/lib/persistence';

import { checkRateLimit } from '@/lib/rate-limit';

// Initialize Postgres connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: text.replace(/\n/g, ' '),
      model: "text-embedding-3-small",
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI Embedding API error: ${await res.text()}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ threads: [], messages: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const threadId = url.searchParams.get("threadId");

    if (threadId) {
      const messages = await getThreadMessages(threadId, userId);
      return new Response(JSON.stringify({ messages }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const threads = await listUserThreads(userId);
    return new Response(JSON.stringify({ threads }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Chat GET error:", error instanceof Error ? error.message : "Unknown error");
    return new Response(JSON.stringify({ error: "Failed to fetch chat history" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized. Please sign in to use the AI chat." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Rate limit per authenticated user
    const rate = checkRateLimit(`chat-${userId}`);
    if (!rate.allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait a moment before sending more messages." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)),
          },
        }
      );
    }

    let parsedBody: any;
    try {
      const rawBody = await req.text();
      parsedBody = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { messages, threadId: requestedThreadId } = parsedBody;

    // Validate messages array
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid request: messages array is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (messages.length > 50) {
      return new Response(JSON.stringify({ error: "Conversation is too long. Please start a new chat." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get the user's latest question
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let userQuery = latestMessage.content || "";
    if (!userQuery && latestMessage.parts) {
      userQuery = latestMessage.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('\n');
    }

    if (typeof userQuery !== "string" || userQuery.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Message content cannot be empty." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (userQuery.length > 2000) {
      return new Response(JSON.stringify({ error: "Message too long. Please limit your message to 2,000 characters." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Identify or create thread for logged in user
    let activeThreadId: string | null = null;
    activeThreadId = await getOrCreateThread(userId, requestedThreadId);
    if (activeThreadId) {
      await saveChatMessage({
        threadId: activeThreadId,
        role: "user",
        content: userQuery,
        updateTitle: true,
      });
    }

    // 1. Generate an embedding of the user's question
    const embedding = await generateEmbedding(userQuery);
    const embeddingStr = `[${embedding.join(',')}]`;

    // 2. Query Neon DB for the most relevant context using pgvector cosine distance (<=>)
    // Enforce that only human-verified official evidence is fed to the AI model
    const queryResult = await pool.query(
      `SELECT country, pathway, source_title, content, source_url, 1 - (embedding <=> $1) AS similarity
       FROM immigration_evidence
       WHERE verification_status = $2
         AND 1 - (embedding <=> $1) > 0.3
       ORDER BY embedding <=> $1
       LIMIT 5`,
      [embeddingStr, 'VERIFIED']
    );

    const contextRows = queryResult.rows;
    
    let contextString = "No specific visa evidence found in the database for this query.";
    if (contextRows.length > 0) {
      contextString = contextRows.map((row, i) => {
        return `--- Evidence ${i+1} ---
Country: ${row.country}
Visa/Pathway: ${row.pathway}
Source: ${row.source_title} (${row.source_url})
Details:
${row.content}
`;
      }).join("\n");
    }

    // 3. Construct System Prompt
    const systemPrompt = `You are Borderless AI, an expert immigration assistant.
Your goal is to answer the user's questions strictly based on the provided Official Evidence.

IMPORTANT RULES:
1. ONLY use the information provided in the Official Evidence below. 
2. If the user asks about a country or visa that is NOT in the Official Evidence, gracefully decline. DO NOT hallucinate or guess. Say "I'm sorry, I don't currently have official government rules for [Country] in my database."
3. When providing an answer, always cite your sources by mentioning the Country, Visa Name, and Source URL provided in the evidence.
4. Format your responses beautifully using Markdown (bullet points, bold text for emphasis).
5. Be concise, helpful, and professional.

OFFICIAL EVIDENCE:
${contextString}
`;

    const coreMessages = messages.map((m: any) => ({
      role: m.role,
      content: m.content || (m.parts && m.parts[0]?.text) || ""
    }));

    // 4. Stream response using Vercel AI SDK
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages: coreMessages,
      temperature: 0.1,
      onFinish: async ({ text }) => {
        if (activeThreadId && text) {
          await saveChatMessage({
            threadId: activeThreadId,
            role: "assistant",
            content: text,
          });
        }
      },
    });

    if (typeof (result as any).toUIMessageStreamResponse === "function") {
      const response = (result as any).toUIMessageStreamResponse();
      if (activeThreadId) {
        response.headers.set("X-Thread-Id", activeThreadId);
      }
      return response;
    }
    return new Response("Error: Could not convert stream", { status: 500 });
  } catch (error) {
    console.error("Chat API Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
