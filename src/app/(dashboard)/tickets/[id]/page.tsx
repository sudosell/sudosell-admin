"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { use } from "react";
import Link from "next/link";
import Badge from "@/components/Badge";
import { DetailSkeleton } from "@/components/Skeleton";
import { useFetch } from "@/lib/hooks";
import { Send } from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender: string;
  createdAt: string;
}

interface TicketDetail {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  messages: Message[];
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: ticket, loading, setData: setTicket } = useFetch<TicketDetail>(`/api/tickets/${id}`);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages]);

  const handleSend = useCallback(async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    const res = await fetch(`/api/tickets/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: reply }),
    });
    if (res.ok) {
      const msg = await res.json();
      setTicket((t) => t ? { ...t, status: "open", messages: [...t.messages, msg] } : t);
      setReply("");
    }
    setSending(false);
  }, [reply, sending, id, setTicket]);

  const toggleStatus = useCallback(async () => {
    if (!ticket) return;
    const newStatus = ticket.status === "open" ? "closed" : "open";
    const res = await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) setTicket((t) => t ? { ...t, status: newStatus } : t);
  }, [ticket, id, setTicket]);

  if (loading) return <DetailSkeleton />;
  if (!ticket) return <div className="text-sm text-red-400 animate-in">Ticket not found</div>;

  return (
    <div>
      <Link href="/tickets" className="text-sm text-[#9898ac] hover:text-white transition-colors duration-150 mb-4 inline-block">&larr; Back to Tickets</Link>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-6 mb-6 animate-in">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-lg font-bold text-white">{ticket.subject}</h2>
            <p className="text-sm text-[#9898ac]">
              by <Link href={`/users/${ticket.user.id}`} className="hover:text-[#b249f8] transition-colors duration-150">{ticket.user.name}</Link>
              <span className="text-[#4a4a5a] ml-2">{ticket.user.email}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge value={ticket.status} />
            <button
              onClick={toggleStatus}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04] transition-all duration-150"
            >
              {ticket.status === "open" ? "Close" : "Reopen"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5 mb-4 animate-in" style={{ animationDelay: "50ms" }}>
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {ticket.messages.map((msg, i) => (
            <div
              key={msg.id}
              className={`p-4 rounded-xl animate-in ${
                msg.sender === "admin"
                  ? "bg-[#b249f8]/5 border border-[#b249f8]/10 ml-8"
                  : "bg-white/[0.02] border border-white/[0.04] mr-8"
              }`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-white">{msg.sender === "admin" ? "Admin" : ticket.user.name}</span>
                <span className="text-xs text-[#4a4a5a] tabular-nums">{new Date(msg.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm text-[#9898ac] whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-4 animate-in" style={{ animationDelay: "100ms" }}>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Type your reply..."
          rows={3}
          className="w-full px-4 py-3 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white placeholder-[#4a4a5a] resize-none focus:outline-none focus:border-[#b249f8]/30 transition-colors duration-150"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend(); }}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleSend}
            disabled={!reply.trim() || sending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#b249f8] text-white hover:bg-[#9333ea] disabled:opacity-50 disabled:pointer-events-none transition-all duration-150"
          >
            <Send size={14} />
            {sending ? "Sending..." : "Send Reply"}
          </button>
        </div>
      </div>
    </div>
  );
}
