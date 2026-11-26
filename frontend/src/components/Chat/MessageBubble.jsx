import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User, ShieldAlert, AlertCircle, LoaderCircle } from "lucide-react";

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`message-row ${isUser ? "message-user" : "message-assistant"}`}>
      <div className={`avatar ${isUser ? "avatar-user" : "avatar-assistant"}`}>
        {isUser ? <User size={17} /> : <Bot size={18} />}
      </div>
      <div className="message-content-wrap">
        <div className="message-author">{isUser ? "You" : "Bedrock Assistant"}</div>
        <div className={`message-bubble ${isUser ? "user-bubble" : "assistant-bubble"}`}>
          {message.content ? (
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          ) : message.pending ? (
            <span className="typing"><LoaderCircle size={15} className="spin" /> Thinking…</span>
          ) : (
            <span className="muted">No response content received.</span>
          )}
          {message.pending && message.content && <span className="stream-cursor" />}
        </div>
        {message.blocked && <div className="message-note warning-note"><ShieldAlert size={14} /> A Bedrock Guardrail intervention occurred.</div>}
        {message.failed && <div className="message-note error-note"><AlertCircle size={14} /> Response interrupted. You can send another message.</div>}
        {message.cost && (
          <div className="message-meta">
            {message.usage?.inputTokens ?? "—"} in · {message.usage?.outputTokens ?? "—"} out
            <span>·</span>
            ${Number(message.cost.totalCost || 0).toFixed(6)}
          </div>
        )}
      </div>
    </div>
  );
}
