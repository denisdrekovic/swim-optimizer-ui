"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  X,
  Send,
  Sparkles,
  Loader2,
  Wrench,
  AlertCircle,
} from "lucide-react";
import {
  streamCoachChat,
  type CoachChatMessage,
  type CoachChatContext,
  type ParameterChange,
} from "@/lib/api";

interface CoachChatProps {
  open: boolean;
  onClose: () => void;
  context: CoachChatContext;
  onParameterChange: (change: ParameterChange) => void;
}

export function CoachChat({
  open,
  onClose,
  context,
  onParameterChange,
}: CoachChatProps) {
  const [messages, setMessages] = useState<CoachChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Track whether onDone has already been called for the current stream
  const doneCalledRef = useRef(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: CoachChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);
    doneCalledRef.current = false;

    // Add a placeholder assistant message for streaming
    const assistantMsg: CoachChatMessage = {
      role: "assistant",
      content: "",
      changes: [],
    };
    setMessages([...newMessages, assistantMsg]);

    const controller = streamCoachChat(
      newMessages.map((m) => ({ role: m.role, content: m.content })),
      context,
      {
        onToken: (text) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: last.content + text,
              };
            }
            return updated;
          });
        },
        onToolCall: (change) => {
          // Add change badge to the current assistant message
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                changes: [...(last.changes || []), change],
              };
            }
            return updated;
          });
          // Propagate to parent to actually update parameters
          if (change.success) {
            onParameterChange(change);
          }
        },
        onDone: () => {
          if (!doneCalledRef.current) {
            doneCalledRef.current = true;
            setIsStreaming(false);
          }
        },
        onError: (err) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: last.content || `Error: ${err}`,
              };
            }
            return updated;
          });
          setIsStreaming(false);
        },
      },
    );

    abortRef.current = controller;
  }, [input, isStreaming, messages, context, onParameterChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed top-[57px] right-0 bottom-0 w-[400px] bg-white border-l border-slate-200 shadow-xl z-20 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">AI Coach</h3>
            <p className="text-[10px] text-slate-400 leading-none">
              Adjust parameters via conversation
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      >
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
              <Sparkles size={20} className="text-blue-500" />
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">
              Meet Strategy Assistant
            </p>
            <p className="text-xs text-slate-400 max-w-[280px] mx-auto leading-relaxed">
              Tell me about swimmer conditions, ask about lineup decisions, or
              request changes. For example:
            </p>
            <div className="mt-3 space-y-1.5">
              {[
                '"Sarah and Emma are tapered"',
                '"Mark is sick, take him out"',
                '"Why isn\'t Jane in the 200 Free?"',
              ].map((ex) => (
                <button
                  key={ex}
                  onClick={() => {
                    setInput(ex.replace(/^"|"$/g, ""));
                    inputRef.current?.focus();
                  }}
                  className="block mx-auto text-[11px] text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === "user" ? (
              <div className="flex justify-end">
                <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-br-md bg-blue-600 text-white text-sm leading-relaxed">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  {/* Tool call badges */}
                  {msg.changes && msg.changes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {msg.changes.map((change, j) => (
                        <span
                          key={j}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            change.success
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {change.success ? (
                            <Wrench size={9} />
                          ) : (
                            <AlertCircle size={9} />
                          )}
                          {change.detail || change.error}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Message text */}
                  {msg.content && (
                    <div className="px-3 py-2 rounded-2xl rounded-bl-md bg-slate-100 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  )}
                  {/* Streaming indicator */}
                  {isStreaming && i === messages.length - 1 && !msg.content && (
                    <div className="px-3 py-2 rounded-2xl rounded-bl-md bg-slate-100 text-slate-400 text-sm">
                      <Loader2 size={14} className="animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-slate-200 px-4 py-3 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isStreaming ? "Waiting for response..." : "Ask about lineup or set conditions..."
            }
            disabled={isStreaming}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none disabled:opacity-50 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {isStreaming ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
