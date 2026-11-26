import { useEffect, useRef } from "react";
import { Bot, ShieldCheck, Zap, Database, RotateCcw } from "lucide-react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";

function Welcome({ onPrompt }) {
  const prompts = [
    "How can I track my order?",
    "What is your return and refund policy?",
    "I received a damaged product. What should I do?"
  ];
  return (
    <div className="welcome">
      <div className="welcome-icon"><Bot size={30} /></div>
      <p className="eyebrow">AI CUSTOMER SUPPORT</p>
      <h1>How can I help you today?</h1>
      <p className="welcome-description">Ask a question and I'll help using the customer-support knowledge configured in your backend.</p>
      <div className="prompt-grid">
        {prompts.map((prompt) => <button key={prompt} className="prompt-card" onClick={() => onPrompt(prompt)}>{prompt}<span>↗</span></button>)}
      </div>
    </div>
  );
}

export default function ChatWindow({ messages, isStreaming, error, onSend, onStop, activeConversation }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <main className="chat-main">
      <header className="topbar">
        <div>
          <div className="topbar-title">Customer Support Assistant</div>
          <div className="topbar-subtitle">{activeConversation?.title || "New conversation"}</div>
        </div>
        <div className="topbar-pills">
          <span><ShieldCheck size={14} /> Guardrails</span>
          <span><Zap size={14} /> Streaming</span>
          <span><Database size={14} /> MongoDB</span>
        </div>
      </header>

      <section className="chat-scroll">
        {messages.length === 0 ? (
          <Welcome onPrompt={onSend} />
        ) : (
          <div className="message-list">
            {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
            <div ref={bottomRef} />
          </div>
        )}
      </section>

      {error && <div className="error-banner"><span>{error}</span><button onClick={() => window.location.reload()} title="Reload"><RotateCcw size={15} /></button></div>}
      <footer className="composer-area">
        <ChatInput onSend={onSend} onStop={onStop} isStreaming={isStreaming} />
        <p className="disclaimer">AI responses can be inaccurate. Verify order, refund and delivery details against your backend records.</p>
      </footer>
    </main>
  );
}
