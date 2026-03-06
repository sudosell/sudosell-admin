"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { use } from "react";
import Link from "next/link";
import Badge from "@/components/Badge";
import Breadcrumb from "@/components/Breadcrumb";
import { DetailSkeleton } from "@/components/Skeleton";
import { Send, Trash2, Paperclip, X, FileIcon, Download, Loader2 } from "lucide-react";
import { usePolling } from "@/lib/hooks";
import { useRouter } from "next/navigation";

interface Attachment {
  key: string;
  name: string;
  size: number;
  type: string;
}

interface Message {
  id: string;
  content: string;
  sender: string;
  attachments?: Attachment[] | null;
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

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentView({ att, ticketId }: { att: Attachment; ticketId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const isImage = att.type.startsWith("image/");

  useEffect(() => {
    fetch(`/api/tickets/${ticketId}/attachments?key=${encodeURIComponent(att.key)}`)
      .then((r) => r.json())
      .then((d) => { if (d.url) setUrl(d.url); })
      .catch(console.error);
  }, [att.key, ticketId]);

  if (isImage) {
    return (
      <a href={url || "#"} target="_blank" rel="noopener noreferrer" className="block">
        {url ? (
          <img
            src={url}
            alt={att.name}
            className="max-h-48 rounded-lg border border-white/[0.06] object-contain"
          />
        ) : (
          <div className="flex h-32 w-48 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <Loader2 size={16} className="animate-spin text-[#9898ac]" />
          </div>
        )}
      </a>
    );
  }

  return (
    <a
      href={url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-[#9898ac] transition-colors hover:bg-white/[0.04]"
    >
      <FileIcon size={14} />
      <span className="max-w-[150px] truncate">{att.name}</span>
      <span className="text-[#4a4a5a]">{formatSize(att.size)}</span>
      <Download size={12} />
    </a>
  );
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
  const [deleting, setDeleting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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

  const lastRealTimestamp = ticket?.messages
    .filter((m) => !m.id.startsWith("temp-"))
    .at(-1)?.createdAt ?? null;

  const pollUrl = ticket && lastRealTimestamp
    ? `/api/tickets/${id}/messages?after=${encodeURIComponent(lastRealTimestamp)}`
    : null;

  const handlePollData = useCallback((data: { messages: Message[]; status: string }) => {
    if (!data.messages?.length && data.status === ticket?.status) return;
    setTicket((prev) => {
      if (!prev) return prev;
      const msgs = [...prev.messages];
      for (const incoming of data.messages) {
        if (msgs.some((m) => m.id === incoming.id)) continue;
        const tempIdx = msgs.findIndex(
          (m) => m.id.startsWith("temp-") && m.content === incoming.content && m.sender === incoming.sender
        );
        if (tempIdx !== -1) {
          msgs[tempIdx] = incoming;
        } else {
          msgs.push(incoming);
        }
      }
      return { ...prev, messages: msgs, status: data.status };
    });
  }, [ticket?.status]);

  usePolling<{ messages: Message[]; status: string }>({
    url: pollUrl,
    interval: 3000,
    enabled: !!ticket && !loading,
    onData: handlePollData,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages?.length]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`/api/tickets/${id}/upload`, {
          method: "POST",
          body: form,
        });
        if (res.ok) {
          const att: Attachment = await res.json();
          setPendingFiles((prev) => [...prev, att]);
        } else {
          const err = await res.json();
          alert(err.error || "Upload failed");
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removePending(key: string) {
    setPendingFiles((prev) => prev.filter((f) => f.key !== key));
  }

  const handleSend = useCallback(async () => {
    if ((!reply.trim() && pendingFiles.length === 0) || sending) return;
    const content = reply.trim() || (pendingFiles.length > 0 ? `Attached ${pendingFiles.length} file(s)` : "");
    const attachments = pendingFiles.length > 0 ? [...pendingFiles] : undefined;
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    setTicket((t) => t ? { ...t, status: "open", messages: [...t.messages, { id: tempId, content, sender: "admin", attachments: attachments || null, createdAt: new Date().toISOString() }] } : t);
    setReply("");
    setPendingFiles([]);

    try {
      const res = await fetch(`/api/tickets/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, attachments }),
      });
      if (res.ok) {
        const msg = await res.json();
        setTicket((t) => t ? { ...t, messages: t.messages.map((m) => m.id === tempId ? msg : m) } : t);
      } else {
        setTicket((t) => t ? { ...t, messages: t.messages.filter((m) => m.id !== tempId) } : t);
        setReply(content);
        setPendingFiles(attachments || []);
      }
    } catch (err) {
      console.error("[ticket/send]", err);
      setTicket((t) => t ? { ...t, messages: t.messages.filter((m) => m.id !== tempId) } : t);
      setReply(content);
      setPendingFiles(attachments || []);
    } finally {
      setSending(false);
    }
  }, [reply, sending, id, pendingFiles]);

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

  const handleDelete = useCallback(async () => {
    if (!ticket || ticket.status !== "closed") return;
    if (!confirm("Permanently delete this ticket, all messages, and all attachments? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tickets/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/tickets");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete ticket");
      }
    } catch {
      alert("Failed to delete ticket");
    } finally {
      setDeleting(false);
    }
  }, [ticket, id, router]);

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
            {ticket.status === "closed" && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/20 text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-all duration-150"
              >
                <Trash2 size={12} />
                {deleting ? "Deleting..." : "Delete"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5 mb-4 animate-in" style={{ animationDelay: "50ms" }}>
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {ticket.messages.map((msg) => {
            const attachments = (msg.attachments as Attachment[] | null) || [];
            return (
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
                {attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {attachments.map((att) => (
                      <AttachmentView key={att.key} att={att} ticketId={ticket.id} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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

        {pendingFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
            {pendingFiles.map((f) => (
              <div
                key={f.key}
                className="flex items-center gap-2 rounded-md bg-white/[0.04] px-2.5 py-1.5 text-xs text-[#9898ac]"
              >
                <FileIcon size={12} />
                <span className="max-w-[140px] truncate">{f.name}</span>
                <span className="text-[#4a4a5a]">{formatSize(f.size)}</span>
                <button onClick={() => removePending(f.key)} className="text-[#7a7a8e] hover:text-white">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Type your reply..."
          rows={3}
          className="w-full px-4 py-3 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white placeholder-[#4a4a5a] resize-none focus:outline-none focus:border-[#b249f8]/30 transition-colors duration-150"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend(); }}
        />
        <div className="flex items-center justify-between mt-2">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04] disabled:opacity-50 transition-all duration-150"
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
              Attach File
            </button>
          </div>
          <button
            onClick={handleSend}
            disabled={(!reply.trim() && pendingFiles.length === 0) || sending}
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
