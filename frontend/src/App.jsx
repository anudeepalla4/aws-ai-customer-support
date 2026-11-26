import { useState } from "react";
import { Sparkles, CircleHelp } from "lucide-react";
import ConversationSidebar from "./components/Sidebar/ConversationSidebar";
import ChatWindow from "./components/Chat/ChatWindow";
import UsageDashboard from "./components/Dashboard/UsageDashboard";
import { useChat } from "./hooks/useChat";
import { getApiBaseUrl } from "./services/chatService";

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const chat = useChat();

  return (
    <div className={`app-shell ${collapsed ? "sidebar-is-collapsed" : ""}`}>
      <ConversationSidebar
        conversations={chat.conversations}
        activeId={chat.activeId}
        onNewChat={chat.newChat}
        onSelect={chat.selectConversation}
        onDelete={chat.deleteConversation}
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      />
      <div className="main-column">
        <div className="environment-bar">
          <div>
            <span className="live-dot" /> Backend connection configured
          </div>
          <span className="api-url">{getApiBaseUrl()}</span>
        </div>
        {currentPage === "dashboard" ? (
          <UsageDashboard onBack={() => setCurrentPage("chat")} />
        ) : (
          <ChatWindow
            messages={chat.messages}
            isStreaming={chat.isStreaming}
            error={chat.error}
            onSend={chat.sendMessage}
            onStop={chat.stopGeneration}
            activeConversation={chat.activeConversation}
          />
        )}
        <div className="powered-by">
          <Sparkles size={12} /> Learning project · React + Node.js + Amazon
          Bedrock <CircleHelp size={12} />
        </div>
      </div>
    </div>
  );
}
