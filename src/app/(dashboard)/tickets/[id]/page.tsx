"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { use } from "react";
import Link from "next/link";
import Badge from "@/components/Badge";
import Breadcrumb from "@/components/Breadcrumb";
import { DetailSkeleton } from "@/components/Skeleton";
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
  priority: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  messages: Message[];
}

const CANNED_RESPONSES = [
  { label: "Select a canned response...", value: "" },
  { label: "Greeting", value: "Hi! Thanks for reaching out. Let me look into this for you." },
  { label: "Need More Info", value: "Could you provide more details about the issue? Screenshots or steps to reproduce would be helpful." },
  { label: "Working On It", value: "We're currently investigating this issue. I'll update you as soon as we have more information." },
  { label: "Resolved", value: "This issue has been resolved. Please let us know if you experience any further problems." },
  { label: "Refund Processing", value: "Your refund request has been processed. Please allow 3-5 business days for the amount to appear in your account." },
];

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/tickets/${id}`)
      .then((r) => r.json())
      .then((d) => { if (active) setTicket(d); })
      .catch(console.error)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages?.length]);

  const handleSend = useCallback(async () => {
    if (!reply.trim() || sending) return;
    const content = reply.trim();
    setSending(true);

    // Optimistic update — show message immediately
    const tempId = `temp-${Date.now()}`;
    setTicket((t) => t ? { ...t, status: "open", messages: [...t.messages, { id: tempId, content, sender: "admin", createdAt: new Date().toISOString() }] } : t);
    setReply("");

    try {
      const res = await fetch(`/api/tickets/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const msg = await res.json();
        setTicket((t) => t ? { ...t, messages: t.messages.map((m) => m.id === tempId ? msg : m) } : t);
      } else {
        setTicket((t) => t ? { ...t, messages: t.messages.filter((m) => m.id !== tempId) } : t);
        setReply(content);
      }
    } catch (err) {
      console.error("[ticket/send]", err);
      setTicket((t) => t ? { ...t, messages: t.messages.filter((m) => m.id !== tempId) } : t);
      setReply(content);
    } finally {
      setSending(false);
    }
  }, [reply, sending, id]);

  const toggleStatus = useCallback(async () => {
    if (!ticket) return;
    const newStatus = ticket.status === "open" ? "closed" : "open";
    const res = await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) setTicket((t) => t ? { ...t, status: newStatus } : t);
  }, [ticket, id]);

  const changePriority = useCallback(async (priority: string) => {
    const res = await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority }),
    });
    if (res.ok) setTicket((t) => t ? { ...t, priority } : t);
  }, [id]);

  if (loading) return <DetailSkeleton />;
  if (!ticket) return <div className="text-sm text-red-400 animate-in">Ticket not found</div>;

  return (
    <div>
      <Breadcrumb items={[{ label: "Tickets", href: "/tickets" }, { label: ticket.subject }]} />

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
            <Badge value={ticket.priority} />
            <Badge value={ticket.status} />
            <select
              value={ticket.priority}
              onChange={(e) => changePriority(e.target.value)}
              className="px-2 py-1 rounded-lg text-xs border border-white/[0.06] bg-[#08080d] text-[#9898ac] focus:outline-none focus:border-[#b249f8]/30 transition-colors"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
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
          {ticket.messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-4 rounded-xl ${
                msg.sender === "admin"
                  ? "bg-[#b249f8]/5 border border-[#b249f8]/10 ml-8"
                  : "bg-white/[0.02] border border-white/[0.04] mr-8"
              }`}
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
        <select
          onChange={(e) => { if (e.target.value) setReply(e.target.value); e.target.value = ""; }}
          className="w-full mb-2 px-3 py-2 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-[#9898ac] focus:outline-none focus:border-[#b249f8]/30 transition-colors"
        >
          {CANNED_RESPONSES.map((r) => (
            <option key={r.label} value={r.value}>{r.label}</option>
          ))}
        </select>
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
