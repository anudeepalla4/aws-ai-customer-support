import { useCallback, useEffect, useRef, useState } from "react";
import { streamChat } from "../services/chatService";

const STORAGE_KEY = "bedrock-support-chat-v1";

function readStoredConversations() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useChat() {
  const [conversations, setConversations] = useState(readStoredConversations);
  const [activeId, setActiveId] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [lastMetrics, setLastMetrics] = useState(null);
  const abortRef = useRef(null);

  const activeConversation = conversations.find((item) => item.id === activeId) || null;
  const messages = activeConversation?.messages || [];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  const updateConversation = useCallback((id, updater) => {
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === id ? updater(conversation) : conversation
      )
    );
  }, []);

  const newChat = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setActiveId(null);
    setError("");
    setLastMetrics(null);
    setIsStreaming(false);
  }, []);

  const selectConversation = useCallback((id) => {
    if (abortRef.current) abortRef.current.abort();
    setActiveId(id);
    setError("");
    setLastMetrics(null);
    setIsStreaming(false);
  }, []);

  const deleteConversation = useCallback((id) => {
    setConversations((previous) => previous.filter((item) => item.id !== id));
    setActiveId((current) => current === id ? null : current);
  }, []);

  const sendMessage = useCallback(async (rawMessage) => {
    const message = rawMessage.trim();
    if (!message || isStreaming) return;

    setError("");
    setLastMetrics(null);

    let conversation = activeConversation;
    if (!conversation) {
      conversation = {
        id: makeId(),
        backendConversationId: null,
        title: message.length > 38 ? `${message.slice(0, 38)}…` : message,
        messages: [],
        updatedAt: new Date().toISOString()
      };
      setConversations((previous) => [conversation, ...previous]);
      setActiveId(conversation.id);
    }

    const localId = conversation.id;
    const userMessage = { id: makeId(), role: "user", content: message, createdAt: new Date().toISOString() };
    const assistantId = makeId();
    const assistantMessage = { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString(), pending: true };

    updateConversation(localId, (current) => ({
      ...current,
      messages: [...current.messages, userMessage, assistantMessage],
      updatedAt: new Date().toISOString()
    }));

    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);

    let backendConversationId = conversation.backendConversationId || null;
    let finalMetrics = null;

    const patchAssistant = (patch) => {
      updateConversation(localId, (current) => ({
        ...current,
        messages: current.messages.map((item) =>
          item.id === assistantId ? { ...item, ...patch } : item
        ),
        updatedAt: new Date().toISOString()
      }));
    };

    try {
      await streamChat({
        message,
        conversationId: backendConversationId,
        signal: controller.signal,
        onEvent: ({ type, data }) => {
          if (type === "conversation" && data && typeof data === "object") {
            backendConversationId = data.conversationId || backendConversationId;
            updateConversation(localId, (current) => ({
              ...current,
              backendConversationId,
              updatedAt: new Date().toISOString()
            }));
          } else if (type === "token") {
            const tokenText = typeof data === "string" ? data : data?.text || "";
            if (tokenText) {
              updateConversation(localId, (current) => ({
                ...current,
                messages: current.messages.map((item) =>
                  item.id === assistantId ? { ...item, content: item.content + tokenText } : item
                )
              }));
            }
          } else if (type === "stop") {
            patchAssistant({
              stopReason: data?.stopReason,
              blocked: Boolean(data?.blocked)
            });
          } else if (type === "done") {
            finalMetrics = data || {};
            backendConversationId = data?.conversationId || backendConversationId;
            setLastMetrics(finalMetrics);
            updateConversation(localId, (current) => ({
              ...current,
              backendConversationId,
              messages: current.messages.map((item) =>
                item.id === assistantId
                  ? { ...item, pending: false, blocked: Boolean(data?.blocked), usage: data?.usage, cost: data?.cost, stopReason: item.stopReason || data?.stopReason }
                  : item
              ),
              updatedAt: new Date().toISOString()
            }));
          } else if (type === "error") {
            throw new Error(data?.message || (typeof data === "string" ? data : "Streaming error"));
          }
        }
      });

      patchAssistant({ pending: false });
      if (!finalMetrics) {
        setLastMetrics(null);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message || "Unable to contact the backend.");
        patchAssistant({ pending: false, failed: true });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [activeConversation, isStreaming, updateConversation]);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return {
    conversations,
    activeId,
    activeConversation,
    messages,
    isStreaming,
    error,
    lastMetrics,
    newChat,
    selectConversation,
    deleteConversation,
    sendMessage,
    stopGeneration
  };
}
