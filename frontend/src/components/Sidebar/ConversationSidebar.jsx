import { MessageSquare, Plus, Trash2, PanelLeftClose, PanelLeftOpen, Sparkles, BarChart3 } from "lucide-react";

export default function ConversationSidebar({
  conversations, activeId, onNewChat, onSelect, onDelete, collapsed, onToggle, currentPage, onNavigate
}) {
  return (
    <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""}`}>
      <div className="sidebar-top">
        {!collapsed && <div className="brand"><div className="brand-mark"><Sparkles size={18} /></div><span>Bedrock Support</span></div>}
        <button className="icon-button sidebar-toggle" onClick={onToggle} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
      <button className="new-chat-button" onClick={onNewChat} title="New chat">
        <Plus size={17} /> {!collapsed && <span>New conversation</span>}
      </button>
      <button className={`sidebar-nav-button ${currentPage === "dashboard" ? "active" : ""}`} onClick={() => onNavigate("dashboard")} title="Usage dashboard">
        <BarChart3 size={16} /> {!collapsed && <span>Usage dashboard</span>}
      </button>
      {!collapsed && <div className="sidebar-label">RECENT CONVERSATIONS</div>}
      <div className="conversation-list">
        {conversations.map((conversation) => (
          <div key={conversation.id} className={`conversation-row ${activeId === conversation.id ? "active" : ""}`}>
            <button className="conversation-select" onClick={() => onSelect(conversation.id)} title={conversation.title}>
              <MessageSquare size={15} />
              {!collapsed && <span>{conversation.title}</span>}
            </button>
            {!collapsed && <button className="delete-button" onClick={() => onDelete(conversation.id)} title="Delete conversation"><Trash2 size={14} /></button>}
          </div>
        ))}
        {!collapsed && conversations.length === 0 && <p className="empty-sidebar">Your conversations will appear here.</p>}
      </div>
      {!collapsed && <div className="sidebar-footer"><span className="status-dot" /> Local development</div>}
    </aside>
  );
}
