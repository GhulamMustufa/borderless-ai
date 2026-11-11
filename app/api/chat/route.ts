import { openai } from '@ai-sdk/openai';
import { createUIMessageStream, createUIMessageStreamResponse, streamText } from 'ai';
import { auth } from '@clerk/nextjs/server';
import {
  listUserThreads,
  getOrCreateThread,
  getThreadMessages,
  saveChatMessage,
} from '@/lib/persistence';
import { checkRateLimit } from '@/lib/rate-limit';
import { retrieveEvidenceForQuery } from '@/lib/evidence';
import {
  extractChatMessageText,
  isContextualImmigrationFollowUp,
  resolveThreadCountryContext,
} from '@/lib/countries';

async function createStaticChatStreamResponse(
  text: string,
  activeThreadId: string | null
): Promise<Response> {
  if (activeThreadId && text) {
    await saveChatMessage({
      threadId: activeThreadId,
      role: 'assistant',
      content: text,
    });
  }

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const msgId = `msg-static-${Date.now()}`;
      const textId = `text-${Date.now()}`;
      writer.write({ type: 'start', messageId: msgId });
      writer.write({ type: 'start-step' });
      writer.write({ type: 'text-start', id: textId });
      writer.write({ type: 'text-delta', id: textId, delta: text });
      writer.write({ type: 'text-end', id: textId });
      writer.write({ type: 'finish-step' });
      writer.write({ type: 'finish' });
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: activeThreadId ? { 'X-Thread-Id': activeThreadId } : undefined,
  });
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized. Please sign in to view chat history.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const threadId = url.searchParams.get('threadId');

    if (threadId) {
      const messages = await getThreadMessages(threadId, userId);
      return new Response(JSON.stringify({ messages }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const threads = await listUserThreads(userId);
    return new Response(JSON.stringify({ threads }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Chat GET error:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(JSON.stringify({ error: 'Failed to fetch chat history' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Please sign in to use the AI chat.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit per authenticated user
    const rate = checkRateLimit(`chat-${userId}`);
    if (!rate.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment before sending more messages.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)),
          },
        }
      );
    }

    let parsedBody: any;
    try {
      const rawBody = await req.text();
      parsedBody = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { messages, threadId: requestedThreadId } = parsedBody;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid request: messages array is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (messages.length > 50) {
      return new Response(JSON.stringify({ error: 'Conversation is too long. Please start a new chat.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const latestMessage = messages[messages.length - 1];
    if (!latestMessage) {
      return new Response(JSON.stringify({ error: 'No messages provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userQuery = extractChatMessageText(latestMessage);

    if (typeof userQuery !== 'string' || userQuery.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Message content cannot be empty.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (userQuery.length > 2000) {
      return new Response(JSON.stringify({ error: 'Message too long. Please limit your message to 2,000 characters.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const activeThreadId = await getOrCreateThread(userId, requestedThreadId);
    if (activeThreadId) {
      await saveChatMessage({
        threadId: activeThreadId,
        role: 'user',
        content: userQuery,
        updateTitle: true,
      });
    }

    const threadContext = resolveThreadCountryContext(messages);
    const isLegalInquiry = isContextualImmigrationFollowUp(
      userQuery,
      threadContext.hasPriorImmigrationTurn
    );
    const detectedCountries = threadContext.countries;
    const unsupportedCountries = threadContext.unsupportedCountries;

    // ------------------------------------------------------------------------
    // CASE A1: Explicit unsupported destination (e.g. Singapore, UAE, Spain)
    // Decline deterministically without falsely asking which country they meant.
    // ------------------------------------------------------------------------
    if (isLegalInquiry && detectedCountries.length === 0 && unsupportedCountries.length > 0) {
      const countryListStr = unsupportedCountries.join(', ');
      const refusalText = `I cannot provide legal or visa requirements for ${countryListStr} because certified, human-reviewed official sources for ${countryListStr} are currently unavailable in my database.

To ensure your safety and prevent unverified legal guidance, Borderless AI only answers legal criteria using verified official sources (currently covering Canada, the United Kingdom, the United States, Australia, New Zealand, Germany, Sweden, Denmark, Norway, and Finland). Please consult official government portals for ${countryListStr} or an accredited immigration attorney.`;

      return await createStaticChatStreamResponse(refusalText, activeThreadId);
    }

    // ------------------------------------------------------------------------
    // CASE A2: Immigration inquiry without a specified country
    // Never perform unrestricted cross-country retrieval. Ask user to clarify.
    // ------------------------------------------------------------------------
    if (isLegalInquiry && detectedCountries.length === 0) {
      const clarificationText =
        'To provide accurate immigration guidance, could you please specify which country or visa pathway you are asking about (for example: Canada, the United Kingdom, the United States, Australia, or Germany)? Immigration requirements vary significantly by jurisdiction.';

      return await createStaticChatStreamResponse(clarificationText, activeThreadId);
    }

    // Build complete multi-part text history for downstream LLM calls
    const coreMessages = messages
      .map((m: any) => ({
        role: (m.role === 'assistant' || m.role === 'system' ? m.role : 'user') as
          | 'user'
          | 'assistant'
          | 'system',
        content: extractChatMessageText(m),
      }))
      .filter((m: any) => m.content.trim().length > 0);

    // ------------------------------------------------------------------------
    // CASE B: Immigration inquiry with resolved country scope
    // Query evidence strictly scoped to the resolved countries.
    // ------------------------------------------------------------------------
    if (isLegalInquiry && detectedCountries.length > 0) {
      const retrievalQuery = threadContext.inheritedFromHistory
        ? `${detectedCountries.join(' ')} immigration requirements — ${userQuery}`
        : userQuery;

      let eligibleRows: any[] = [];
      try {
        eligibleRows = await retrieveEvidenceForQuery(retrievalQuery, detectedCountries, undefined, 5);
      } catch (retrievalError) {
        console.warn('Chat evidence retrieval failed closed:', retrievalError);
        eligibleRows = [];
      }

      if (eligibleRows.length === 0) {
        const countryListStr = detectedCountries.join(', ');
        const refusalText = `I cannot provide legal or visa requirements for ${countryListStr} because certified, human-reviewed official sources matching your question are currently unavailable in my database.

To ensure your safety and prevent unverified legal guidance, Borderless AI does not generate ungrounded immigration conclusions. Please consult official government immigration portals for ${countryListStr} (such as official .gov or government sites) or an accredited immigration attorney for definitive, current requirements.`;

        return await createStaticChatStreamResponse(refusalText, activeThreadId);
      }

      const contextString = eligibleRows
        .map((row, i) => {
          return `--- Evidence ${i + 1} ---
Country: ${row.country}
Visa/Pathway: ${row.pathway}
Source: ${row.source_title} (${row.source_url})
Details:
${row.content}
`;
        })
        .join('\n');

      const systemPrompt = `You are Borderless AI, an expert immigration assistant.
Active Destination Jurisdiction(s): ${detectedCountries.join(', ')}.
Your goal is to answer the user's questions strictly based on the provided Official Evidence.

IMPORTANT RULES:
1. ONLY use the information provided in the Official Evidence below.
2. If the user asks about a country or visa rule that is NOT in the Official Evidence, gracefully decline that missing point rather than guessing. Say "I don't currently have certified official rules on that specific point in my database."
3. When providing an answer, always cite your sources by mentioning the Country, Visa Name, and exact Source URL provided in the evidence.
4. Format your responses cleanly using Markdown (bullet points, bold text for emphasis).
5. Be concise, helpful, and professional.

OFFICIAL EVIDENCE:
${contextString}
`;

      const result = streamText({
        model: openai('gpt-4o-mini'),
        system: systemPrompt,
        messages: coreMessages,
        temperature: 0.1,
        onFinish: async ({ text }) => {
          if (activeThreadId && text) {
            await saveChatMessage({ threadId: activeThreadId, role: 'assistant', content: text });
          }
        },
      });

      const response = (result as any).toUIMessageStreamResponse();
      if (activeThreadId) response.headers.set('X-Thread-Id', activeThreadId);
      return response;
    }

    // ------------------------------------------------------------------------
    // CASE C: General conversational inquiry (Greetings, platform help, etc.)
    // ------------------------------------------------------------------------
    const generalSystemPrompt = `You are Borderless AI, an intelligent assistant designed to help global professionals explore career and educational opportunities.
Answer the user's general questions, greetings, or platform navigation questions politely and helpfully.
If the user asks for specific immigration rules, visa criteria, or legal requirements, kindly ask them which country they are interested in so that official evidence can be checked.`;

    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: generalSystemPrompt,
      messages: coreMessages,
      temperature: 0.2,
      onFinish: async ({ text }) => {
        if (activeThreadId && text) {
          await saveChatMessage({ threadId: activeThreadId, role: 'assistant', content: text });
        }
      },
    });

    const response = (result as any).toUIMessageStreamResponse();
    if (activeThreadId) response.headers.set('X-Thread-Id', activeThreadId);
    return response;
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
