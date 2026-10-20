'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, BookOpen, Trash2, User, Sparkles, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

interface Source {
  chunk_id: string;
  chunk_index: number;
  page_number: number;
  score: number;
  preview: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Source[];
}

interface ChatInterfaceProps {
  documentId: string;
}


export function ChatInterface({ documentId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadChatHistory();
  }, [documentId]);

  const loadChatHistory = async () => {
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${API_BASE}/api/v1/chat/sessions/document/${documentId}`,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) {
        setHistoryLoading(false);
        return;
      }

      const sessions = await response.json();

      if (sessions && sessions.length > 0) {
        const latestSession = sessions[0];
        setSessionId(latestSession.id);

        const msgResponse = await fetch(
          `${API_BASE}/api/v1/chat/sessions/${latestSession.id}`,
          {
            headers: {
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        if (msgResponse.ok) {
          const sessionData = await msgResponse.json();
          const loadedMessages: Message[] = (sessionData.messages || []).map(
            (m: any) => {
              let sources: Source[] = [];
              if (m.sources) {
                try {
                  sources = JSON.parse(m.sources);
                } catch {}
              }
              return {
                id: m.id,
                role: m.role,
                content: m.content,
                timestamp: new Date(m.created_at),
                sources,
              };
            }
          );
          setMessages(loadedMessages);
        }
      }
    } catch (error) {
      // Silent fail
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const question = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/api/v1/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          message: question,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to get response');
      }

      const data = await response.json();

      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
      }

      let sources: Source[] = [];
      if (data.message.sources) {
        try {
          sources = JSON.parse(data.message.sources);
        } catch {
          sources = [];
        }
      }

      const assistantMessage: Message = {
        id: data.message.id,
        role: 'assistant',
        content: data.message.content,
        timestamp: new Date(data.message.created_at),
        sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content:
            'Sorry, I encountered an error while processing your question. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!confirm('Clear this chat? This will delete the conversation history.')) return;

    if (sessionId) {
      try {
        const token = localStorage.getItem('access_token');
        await fetch(`${API_BASE}/api/v1/chat/sessions/${sessionId}`, {
          method: 'DELETE',
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
      } catch {}
    }

    setMessages([]);
    setSessionId(null);
    toast.success('Chat cleared');
  };

  const handleCopy = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    'What is this document about?',
    'Summarize the key points',
    'What is the main topic?',
  ];

  if (historyLoading) {
    return (
      <div className="flex flex-col h-[600px] items-center justify-center">
        <div className="inline-block w-10 h-10 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
        <p className="text-gray-500 mt-4 text-sm">Loading chat history...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px]">
      {/* Header with Clear button */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-gray-700">{messages.length}</span> message
            {messages.length !== 1 ? 's' : ''}
          </p>
          <button
            onClick={handleClearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition font-medium"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1 py-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200 mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Start a conversation
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
              Ask anything about this document
            </p>
            <div className="flex flex-col gap-2 max-w-sm mx-auto">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-4 py-2.5 text-sm bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 rounded-xl transition border border-gray-100 hover:border-indigo-200 text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <div
              key={message.id}
              className={cn('flex gap-3 animate-slide-up', isUser && 'flex-row-reverse')}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white',
                  isUser
                    ? 'bg-gradient-to-br from-indigo-500 to-violet-600'
                    : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                )}
              >
                {isUser ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </div>

              {/* Message bubble */}
              <div className={cn('flex-1 max-w-[85%]', isUser && 'flex flex-col items-end')}>
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3 shadow-sm',
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-sm'
                      : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </p>

                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">
                        <BookOpen className="w-3 h-3" />
                        Sources ({message.sources.length})
                      </div>
                      <div className="space-y-1.5">
                        {message.sources.map((source, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-gray-50 hover:bg-gray-100 rounded-lg p-2 border border-gray-100 transition"
                          >
                            <div className="flex justify-between text-gray-500 mb-1 font-medium">
                              <span>Chunk {source.chunk_index + 1}</span>
                              <span>Page {source.page_number}</span>
                            </div>
                            <p className="text-gray-600 line-clamp-2">
                              {source.preview}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer: time + copy */}
                <div className={cn('flex items-center gap-2 mt-1 px-1', isUser && 'flex-row-reverse')}>
                  <p className="text-[10px] text-gray-400">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {!isUser && (
                    <button
                      onClick={() => handleCopy(message.id, message.content)}
                      className="p-1 text-gray-400 hover:text-indigo-600 transition"
                      title="Copy"
                    >
                      {copiedId === message.id ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 animate-slide-up">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex gap-2 pt-4 border-t border-gray-100">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about this document..."
          className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition"
          rows={1}
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className={cn(
            'px-4 rounded-xl transition-all flex items-center justify-center shadow-sm',
            input.trim() && !isLoading
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}