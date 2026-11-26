import { ArrowUp, Square, Paperclip } from "lucide-react";
import { useState } from "react";

export default function ChatInput({ onSend, onStop, isStreaming }) {
  const [value, setValue] = useState("");

  const submit = (event) => {
    event.preventDefault();
    if (!value.trim() || isStreaming) return;
    onSend(value);
    setValue("");
  };

  return (
    <form className="composer" onSubmit={submit}>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit(event);
          }
        }}
        placeholder="Message your customer support assistant…"
        rows={1}
        aria-label="Message"
      />
      <div className="composer-bottom">
        <span className="composer-hint"><Paperclip size={13} /> Enter to send · Shift + Enter for new line</span>
        {isStreaming ? (
          <button type="button" className="send-button stop-button" onClick={onStop} title="Stop generation"><Square size={15} fill="currentColor" /></button>
        ) : (
          <button type="submit" className="send-button" disabled={!value.trim()} title="Send message"><ArrowUp size={18} /></button>
        )}
      </div>
    </form>
  );
}
