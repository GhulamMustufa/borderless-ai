"use client";

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useAuth, SignInButton } from '@clerk/nextjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Markdown from 'react-markdown';

interface ChatThread {
  id: string;
  title: string;
  updatedAt: string;
}

export default function ChatPage() {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const activeThreadIdRef = useRef<string | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { isSignedIn, isLoaded } = useAuth();
  const isSignedInRef = useRef(isSignedIn);
  isSignedInRef.current = isSignedIn;

  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchThreads = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      setLoadingThreads(true);
      const res = await fetch("/api/chat");
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads || []);
      }
    } catch (e) {
      console.error("Failed to fetch threads:", e);
    } finally {
      setLoadingThreads(false);
    }
  }, [isSignedIn]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: {
            ...(body ?? {}),
            messages,
            threadId: (body as Record<string, unknown> | undefined)?.threadId ?? activeThreadIdRef.current ?? undefined,
          },
        }),
        fetch: async (input, init) => {
          const res = await fetch(input, init);
          const serverThreadId = res.headers.get("X-Thread-Id");
          if (serverThreadId && activeThreadIdRef.current !== serverThreadId) {
            activeThreadIdRef.current = serverThreadId;
            setActiveThreadId(serverThreadId);
          }
          return res;
        },
      }),
    [],
  );

  const { messages, setMessages, status, sendMessage, error, clearError } = useChat({
    transport,
    onFinish: () => {
      if (isSignedInRef.current) {
        void fetchThreads();
      }
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // Load threads when authenticated
  useEffect(() => {
    if (isSignedIn) {
      void fetchThreads();
    } else {
      activeThreadIdRef.current = null;
      setActiveThreadId(null);
      setThreads([]);
    }
  }, [isSignedIn, fetchThreads]);

  // Load messages when selecting a thread
  const selectThread = async (threadId: string) => {
    clearError?.();
    activeThreadIdRef.current = threadId;
    setActiveThreadId(threadId);
    setSidebarOpen(false);
    try {
      const res = await fetch(`/api/chat?threadId=${encodeURIComponent(threadId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          setMessages(
            data.messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              parts: [{ type: 'text', text: m.content }],
            }))
          );
        }
      }
    } catch (e) {
      console.error("Failed to load thread messages:", e);
    }
  };

  const startNewChat = () => {
    clearError?.();
    activeThreadIdRef.current = null;
    setActiveThreadId(null);
    setMessages([]);
    setSidebarOpen(false);
  };

  const handleFormSubmit = async (e?: React.FormEvent, customValue?: string) => {
    if (e) e.preventDefault();
    if (!isSignedIn) return;

    const content = customValue || inputValue;
    if (!content.trim() || isLoading) return;

    clearError?.();
    setInputValue("");

    try {
      await sendMessage(
        { text: content },
        {
          body: {
            threadId: activeThreadIdRef.current ?? undefined,
          },
        }
      );
    } catch (err) {
      console.error("Failed to send chat message:", err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-[#0a0a0a] font-sans overflow-hidden">

      {/* Sidebar for Authenticated Users */}
      {isSignedIn && (
        <>
          {/* Mobile Overlay */}
          {sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
            />
          )}

          <aside className={`
            fixed md:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#121212] border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}>
            {/* Sidebar Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>New Chat</span>
              </button>
            </div>

            {/* Threads List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Past Chats
              </div>
              {loadingThreads && threads.length === 0 ? (
                <div className="p-4 text-xs text-slate-400 text-center">Loading your chats...</div>
              ) : threads.length === 0 ? (
                <div className="p-4 text-xs text-slate-400 text-center">No past chats yet.</div>
              ) : (
                threads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => selectThread(thread.id)}
                    className={`w-full text-left rounded-lg px-3 py-2 text-xs transition flex items-center gap-2 ${
                      activeThreadId === thread.id
                        ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800/60"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <span className="truncate flex-1">{thread.title}</span>
                  </button>
                ))
              )}
            </div>

            {/* Saved Account Status */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#161616] text-[11px] text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Chats saved to your account
              </span>
            </div>
          </aside>
        </>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Top Chat Bar */}
        <div className="h-11 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between bg-white dark:bg-[#111]">
          <div className="flex items-center gap-2">
            {isSignedIn && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden inline-flex p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="Open Past Chats"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {activeThreadId
                ? threads.find((t) => t.id === activeThreadId)?.title || "Visa Chat"
                : "New Visa Chat"}
            </span>
          </div>
          {isSignedIn && (
            <button
              onClick={startNewChat}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              + New Chat
            </button>
          )}
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto w-full">
          <div className="p-4 sm:p-6 w-full max-w-4xl mx-auto space-y-8 pb-32">

            {isLoaded && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in zoom-in duration-500 pt-10">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg rotate-2">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 tracking-tight">
                    Borderless AI Visa Assistant
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
                    Ask any question about moving abroad. Answers come straight from official government visa rules—never guesswork.
                  </p>
                </div>

                {isSignedIn ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mt-4">
                    <button
                      type="button"
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-left text-sm text-slate-600 dark:text-slate-300 shadow-sm cursor-pointer hover:border-indigo-500 transition-colors"
                      onClick={() => handleFormSubmit(undefined, "What do I need for Germany's Opportunity Card visa?")}
                    >
                      &ldquo;What do I need for Germany&apos;s Opportunity Card visa?&rdquo;
                    </button>
                    <button
                      type="button"
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-left text-sm text-slate-600 dark:text-slate-300 shadow-sm cursor-pointer hover:border-indigo-500 transition-colors"
                      onClick={() => handleFormSubmit(undefined, "Do I need a job offer for Canadian Express Entry?")}
                    >
                      &ldquo;Do I need a job offer for Canadian Express Entry?&rdquo;
                    </button>
                  </div>
                ) : (
                  <div
                    data-testid="chat-signin-gate"
                    className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 mt-2"
                  >
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      Sign in to chat with the Visa Assistant
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Answers are backed by official government rules, and your chat history is saved safely to your account.
                    </p>
                    <SignInButton mode="modal">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 text-sm transition-all shadow-sm"
                      >
                        Sign In to Start Chatting
                      </button>
                    </SignInButton>
                  </div>
                )}
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role !== 'user' && (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                    <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                    </svg>
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[80%] px-5 py-4 shadow-sm ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm'
                    : 'bg-white dark:bg-[#111] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm'
                }`}>
                  <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                    <Markdown>
                      {(m as any).content ||
                       (m.parts && m.parts.map((p: any) => p.type === 'text' ? p.text : '').join('')) ||
                       ""}
                    </Markdown>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                  <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                  </svg>
                </div>
                <div className="bg-white dark:bg-[#111] border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}

            {error && (
              <div
                data-testid="chat-error"
                className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-xs text-rose-700 dark:text-rose-300"
              >
                <span>{error.message || "Unable to complete request. Please try again."}</span>
                <button
                  type="button"
                  onClick={() => clearError?.()}
                  className="font-semibold underline hover:no-underline shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-[#0a0a0a] border-t border-slate-200 dark:border-slate-800 w-full z-10 relative">
          <div className="max-w-4xl mx-auto">
            {isLoaded && !isSignedIn ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-4 py-3">
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  Sign in to ask questions in the Visa Assistant.
                </span>
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Sign In to Continue
                  </button>
                </SignInButton>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="relative flex items-center shadow-sm rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all">
                <input
                  className="w-full bg-transparent border-none py-4 pl-6 pr-14 focus:outline-none text-slate-800 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 text-sm"
                  value={inputValue}
                  disabled={!isLoaded || !isSignedIn}
                  placeholder="Ask about a visa, e.g. 'Do I need a job offer for Germany?'"
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!isLoaded || !isSignedIn || isLoading || !inputValue.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 ml-0.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                  </svg>
                </button>
              </form>
            )}
            <div className="text-center mt-3 text-xs text-slate-500 dark:text-slate-500">
              Answers come from official government pages. Always double-check on official websites before applying.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
