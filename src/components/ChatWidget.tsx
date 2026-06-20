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
    if (isAdmin) return;
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
  }, [isAdmin, fetchMessages]);

  useEffect(() => {
    if (!initialized || isAdmin) return;
    const id = setInterval(fetchMessages, 5000);
    return () => clearInterval(id);
  }, [initialized, isAdmin, fetchMessages]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      lastAdminCount.current = messages.filter((m) => m.sender === 'admin').length;
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }, [open, messages]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

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
    try {
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
          style={{ maxHeight: '520px' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1e5631] to-[#27723f] px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <MessageCircle className="w-4.5 h-4.5 text-white w-5 h-5" />
              </div>
              <div>
                <p className="text-white text-sm font-bold leading-none">JJ Construcción</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-[#4ade80] rounded-full" />
                  <p className="text-white/70 text-xs">Online · usually replies fast</p>
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
                  OK
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8faf9]" style={{ minHeight: 0 }}>
            {messages.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 bg-[#1e5631]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="w-7 h-7 text-[#1e5631]" />
                </div>
                <p className="text-gray-700 text-sm font-semibold">How can we help?</p>
                <p className="text-gray-400 text-xs mt-1 leading-relaxed max-w-[200px] mx-auto">
                  Ask us anything about our products or services.
                </p>
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
                    <p>{msg.message}</p>
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
