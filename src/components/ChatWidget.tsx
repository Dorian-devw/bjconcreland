import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, ChevronDown, Loader2 } from 'lucide-react';
import { API } from '@/lib/api';
import { useLocation } from 'react-router-dom';

function generateSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

interface ChatMessage {
  id: number;
  session_id: string;
  sender: 'user' | 'admin';
  message: string;
  created_at: string;
}

function renderMessageContent(text: string, isUser: boolean = false) {
  if (!text) return '';
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    // Split by markdown bold tags (**bold**) or URLs (http:// or https://)
    const parts = line.split(/(\*\*.*?\*\*|https?:\/\/[^\s]+)/g);
    const lineContent = parts.map((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={partIdx} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('http://') || part.startsWith('https://')) {
        return (
          <a
            key={partIdx}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline font-semibold break-all ${
              isUser ? 'text-emerald-200 hover:text-white' : 'text-[#1e5631] hover:text-[#164a28]'
            }`}
          >
            {part}
          </a>
        );
      }
      return part;
    });

    return (
      <span key={lineIdx}>
        {lineContent}
        {lineIdx < lines.length - 1 && <br />}
      </span>
    );
  });
}

export function ChatWidget() {
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [nameInput, setNameInput] = useState('');
  const [visitorName, setVisitorName] = useState<string | null>(null);

  const sessionId = useRef<string>(
    (() => {
      const stored = localStorage.getItem('chat-session-id');
      if (stored) return stored;
      const id = generateSessionId();
      localStorage.setItem('chat-session-id', id);
      return id;
    })()
  );

  const lastAdminCount = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isAdmin = location.pathname === '/jozarzc';

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API}/chat/messages/${sessionId.current}`);
      if (!res.ok) return;
      const data: ChatMessage[] = await res.json();
      setMessages(data);
      const adminCount = data.filter((m) => m.sender === 'admin').length;
      if (!open && adminCount > lastAdminCount.current) {
        setUnread((prev) => prev + (adminCount - lastAdminCount.current));
      }
      lastAdminCount.current = adminCount;
    } catch (_) {}
  }, [open]);

  useEffect(() => {
    if (isAdmin || initialized) return;
    const hasActiveSession = localStorage.getItem('chat-has-active') === 'true';
    if (!open && !hasActiveSession) return;

    const sid = sessionId.current;
    const storedName = localStorage.getItem('chat-visitor-name');
    if (storedName) setVisitorName(storedName);
    (async () => {
      try {
        await fetch(`${API}/chat/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sid, visitorName: storedName || 'Visitor' }),
        });
        setInitialized(true);
        await fetchMessages();
      } catch (_) {}
    })();
  }, [isAdmin, open, initialized, fetchMessages]);

  useEffect(() => {
    if (!initialized || isAdmin) return;
    const id = setInterval(fetchMessages, 5000);
    return () => clearInterval(id);
  }, [initialized, isAdmin, fetchMessages]);

  const prevOpen = useRef(open);
  const prevMessagesLength = useRef(messages.length);

  useEffect(() => {
    if (open) {
      setUnread(0);
      lastAdminCount.current = messages.filter((m) => m.sender === 'admin').length;
    }
    if (open && (!prevOpen.current || messages.length > prevMessagesLength.current)) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
    prevOpen.current = open;
    prevMessagesLength.current = messages.length;
  }, [open, messages]);

  if (isAdmin) return null;

  const handleOpen = () => {
    setOpen(true);
    setUnread(0);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSetName = async () => {
    const name = nameInput.trim() || 'Visitor';
    localStorage.setItem('chat-visitor-name', name);
    setVisitorName(name);
    try {
      await fetch(`${API}/chat/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionId.current, visitorName: name }),
      });
    } catch (_) {}
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    // Auto-save name if they typed it in nameInput but didn't click save
    if (!visitorName && nameInput.trim()) {
      await handleSetName();
    }

    try {
      localStorage.setItem('chat-has-active', 'true');
      await fetch(`${API}/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionId.current, message: text }),
      });
      await fetchMessages();
    } catch (_) {} finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end gap-3 pointer-events-none">
      {/* Chat panel */}
      {open && (
        <div
          className="pointer-events-auto w-[22rem] sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          style={{ maxHeight: '540px' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1e5631] to-[#27723f] px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-bold leading-none">JJ Construction</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-[#4ade80] rounded-full animate-pulse" />
                  <p className="text-white/80 text-xs">Online · replies fast</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              aria-label="Minimize chat"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Human Assistant WhatsApp Banner */}
          <div className="bg-emerald-50/90 border-b border-emerald-100 px-3.5 py-2 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <p className="text-xs text-emerald-950 font-medium truncate">
                Talk to a <span className="font-bold">Human Assistant</span>
              </p>
            </div>
            <a
              href="https://wa.me/18013472165"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold px-3 py-1 rounded-full transition-all shadow-sm active:scale-95 shrink-0"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              <span>WhatsApp</span>
            </a>
          </div>

          {/* Name prompt */}
          {!visitorName && (
            <div className="px-4 py-3 bg-[#f0faf3] border-b border-[#1e5631]/10 shrink-0">
              <p className="text-xs font-semibold text-[#1e5631] mb-2">Your name (optional)</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSetName(); }}
                  placeholder="e.g. John"
                  className="flex-1 text-sm border border-[#1e5631]/20 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1e5631]/30"
                />
                <button
                  onClick={handleSetName}
                  className="text-xs font-bold bg-[#1e5631] text-white px-3 py-1.5 rounded-lg hover:bg-[#164a28] transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8faf9]" style={{ minHeight: 0 }}>
            {messages.length === 0 ? (
              <div className="text-center py-8 px-2">
                <div className="w-14 h-14 bg-[#1e5631]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="w-7 h-7 text-[#1e5631]" />
                </div>
                <p className="text-gray-800 text-sm font-bold">How can we help you today?</p>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed max-w-[230px] mx-auto">
                  Ask our AI assistant or talk directly with a Human Assistant.
                </p>
                <a
                  href="https://wa.me/18013472165"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md active:scale-95"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  <span>Talk to Human Assistant</span>
                </a>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'admin' && (
                    <div className="w-6 h-6 bg-[#1e5631] rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 mt-auto mb-1 mr-1.5">
                      JJ
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                      msg.sender === 'user'
                        ? 'bg-[#1e5631] text-white rounded-br-sm shadow-sm'
                        : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{renderMessageContent(msg.message, msg.sender === 'user')}</p>
                    <p className={`text-[10px] mt-0.5 ${msg.sender === 'user' ? 'text-white/55 text-right' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 bg-white flex gap-2 items-end shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Type a message…"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e5631]/25 focus:border-[#1e5631]/50 placeholder:text-gray-400 leading-relaxed bg-gray-50/60"
              style={{ maxHeight: '80px', overflowY: 'auto' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="w-9 h-9 bg-[#1e5631] hover:bg-[#164a28] disabled:bg-gray-200 text-white disabled:text-gray-400 rounded-xl flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-sm"
              aria-label="Send message"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className="pointer-events-auto relative w-14 h-14 bg-[#1e5631] hover:bg-[#164a28] text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        <span className={`transition-all duration-200 ${open ? 'opacity-0 scale-50 absolute' : 'opacity-100 scale-100'}`}>
          <MessageCircle className="w-6 h-6" />
        </span>
        <span className={`transition-all duration-200 ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-50 absolute'}`}>
          <X className="w-6 h-6" />
        </span>
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#e85d04] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </div>
  );
}
