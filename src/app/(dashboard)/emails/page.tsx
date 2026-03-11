"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Send,
  Eye,
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link,
  ImagePlus,
  Quote,
  Minus,
  Code,
  AlignLeft,
  AlignCenter,
  Users,
  Mail,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

type RecipientMode = "all" | "single";

interface SendProgress {
  type: "start" | "progress" | "done";
  sent: number;
  failed: number;
  total: number;
}

export default function EmailsPage() {
  const [subject, setSubject] = useState("");
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("all");
  const [singleEmail, setSingleEmail] = useState("");
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<SendProgress | null>(null);
  const [uploading, setUploading] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exec = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  }, []);

  function insertLink() {
    const url = prompt("Enter URL:");
    if (url) exec("createLink", url);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/emails/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      exec("insertImage", url);
    } catch {
      alert("Image upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function getEditorHtml() {
    return editorRef.current?.innerHTML || "";
  }

  async function handleSend() {
    const body = getEditorHtml().trim();
    if (!subject.trim()) return alert("Subject is required");
    if (!body || body === "<br>") return alert("Email body is required");
    if (recipientMode === "single" && !singleEmail.trim()) return alert("Recipient email is required");

    if (recipientMode === "all") {
      if (!confirm("Send this email to ALL subscribers?")) return;
    }

    setSending(true);
    setProgress(null);

    try {
      const payload = {
        subject: subject.trim(),
        body,
        recipient: recipientMode === "all" ? "all" : singleEmail.trim(),
      };

      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream")) {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                setProgress(data);
              } catch {}
            }
          }
        }
      } else {
        const data = await res.json();
        if (data.error) {
          alert(data.error);
        } else {
          setProgress({ type: "done", sent: 1, failed: 0, total: 1 });
        }
      }
    } catch {
      alert("Failed to send emails");
    } finally {
      setSending(false);
    }
  }

  function resetForm() {
    setSubject("");
    setSingleEmail("");
    setProgress(null);
    if (editorRef.current) editorRef.current.innerHTML = "";
  }

  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.focus();
    }
  }, []);

  const toolbarGroups = [
    [
      { icon: Bold, cmd: "bold", label: "Bold" },
      { icon: Italic, cmd: "italic", label: "Italic" },
      { icon: Underline, cmd: "underline", label: "Underline" },
    ],
    [
      { icon: Heading1, cmd: "formatBlock", val: "h1", label: "Heading 1" },
      { icon: Heading2, cmd: "formatBlock", val: "h2", label: "Heading 2" },
    ],
    [
      { icon: List, cmd: "insertUnorderedList", label: "Bullet List" },
      { icon: ListOrdered, cmd: "insertOrderedList", label: "Numbered List" },
      { icon: Quote, cmd: "formatBlock", val: "blockquote", label: "Quote" },
    ],
    [
      { icon: AlignLeft, cmd: "justifyLeft", label: "Align Left" },
      { icon: AlignCenter, cmd: "justifyCenter", label: "Align Center" },
    ],
    [
      { icon: Link, cmd: "link", label: "Insert Link" },
      { icon: Code, cmd: "formatBlock", val: "pre", label: "Code Block" },
      { icon: Minus, cmd: "insertHorizontalRule", label: "Divider" },
    ],
  ];

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Compose Email</h2>
          <p className="text-sm text-[#9898ac] mt-0.5">Create and send emails to subscribers</p>
        </div>
      </div>

      {/* Progress overlay */}
      {(sending || (progress && progress.type === "done")) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-2xl border border-white/[0.06] bg-[#0d0d12] p-8 shadow-2xl">
            {progress?.type === "done" ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 size={32} className="text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Emails Sent</h3>
                <p className="text-[#9898ac] text-sm mb-1">
                  Successfully sent <span className="text-emerald-400 font-bold">{progress.sent}</span> of {progress.total}
                </p>
                {progress.failed > 0 && (
                  <p className="text-red-400 text-sm mb-1">
                    <AlertCircle size={14} className="inline mr-1" />
                    {progress.failed} failed
                  </p>
                )}
                <div className="flex gap-3 mt-6 justify-center">
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 rounded-lg bg-[#b249f8] text-white text-sm font-medium hover:bg-[#9333ea] transition-colors"
                  >
                    New Email
                  </button>
                  <button
                    onClick={() => setProgress(null)}
                    className="px-4 py-2 rounded-lg border border-white/[0.06] text-[#9898ac] text-sm font-medium hover:text-white hover:bg-white/[0.04] transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <Loader2 size={32} className="mx-auto mb-4 text-[#b249f8] animate-spin" />
                <h3 className="text-lg font-semibold text-white mb-2">Sending Emails...</h3>
                {progress ? (
                  <>
                    <div className="mb-3">
                      <span className="text-3xl font-bold text-[#b249f8]">{progress.sent}</span>
                      <span className="text-[#4a4a5a] text-lg"> / {progress.total}</span>
                    </div>
                    <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-gradient-to-r from-[#b249f8] to-[#f649a7] rounded-full transition-all duration-300"
                        style={{ width: `${(progress.sent + progress.failed) / progress.total * 100}%` }}
                      />
                    </div>
                    <p className="text-[#4a4a5a] text-xs">
                      {Math.round((progress.sent + progress.failed) / progress.total * 100)}% complete
                      {progress.failed > 0 && ` · ${progress.failed} failed`}
                    </p>
                  </>
                ) : (
                  <p className="text-[#9898ac] text-sm">Preparing...</p>
                )}
                <p className="text-[#4a4a5a] text-xs mt-4">Do not close this page</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recipient */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5 mb-4">
        <label className="text-xs font-medium text-[#9898ac] uppercase tracking-wider mb-3 block">Recipient</label>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setRecipientMode("all")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              recipientMode === "all"
                ? "bg-[#b249f8]/10 text-[#b249f8] border border-[#b249f8]/20"
                : "border border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <Users size={15} />
            All Subscribers
          </button>
          <button
            onClick={() => setRecipientMode("single")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              recipientMode === "single"
                ? "bg-[#b249f8]/10 text-[#b249f8] border border-[#b249f8]/20"
                : "border border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <Mail size={15} />
            Single Email
          </button>
        </div>
        {recipientMode === "single" && (
          <input
            type="email"
            placeholder="recipient@example.com"
            value={singleEmail}
            onChange={(e) => setSingleEmail(e.target.value)}
            className="w-full max-w-sm px-4 py-2.5 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white placeholder-[#4a4a5a] focus:outline-none focus:border-[#b249f8]/30 transition-colors"
          />
        )}
      </div>

      {/* Subject */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5 mb-4">
        <label className="text-xs font-medium text-[#9898ac] uppercase tracking-wider mb-3 block">Subject</label>
        <input
          type="text"
          placeholder="Email subject line..."
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white placeholder-[#4a4a5a] focus:outline-none focus:border-[#b249f8]/30 transition-colors"
        />
      </div>

      {/* Editor */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 overflow-hidden mb-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 border-b border-white/[0.06] px-3 py-2 bg-[#08080d]/50">
          {toolbarGroups.map((group, gi) => (
            <div key={gi} className="flex items-center gap-0.5">
              {gi > 0 && <div className="w-px h-5 bg-white/[0.06] mx-1" />}
              {group.map(({ icon: Icon, cmd, val, label }) => (
                <button
                  key={cmd + (val || "")}
                  onClick={() => {
                    if (cmd === "link") insertLink();
                    else if (val) exec(cmd, val);
                    else exec(cmd);
                  }}
                  title={label}
                  className="p-1.5 rounded-md text-[#9898ac] hover:text-white hover:bg-white/[0.06] transition-all duration-100"
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
          ))}

          <div className="w-px h-5 bg-white/[0.06] mx-1" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Insert Image"
            className="p-1.5 rounded-md text-[#9898ac] hover:text-white hover:bg-white/[0.06] transition-all duration-100 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleImageUpload}
            className="hidden"
          />

          <div className="ml-auto">
            <button
              onClick={() => setPreview(!preview)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                preview
                  ? "bg-[#b249f8]/10 text-[#b249f8]"
                  : "text-[#9898ac] hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Eye size={13} />
              {preview ? "Edit" : "Preview"}
            </button>
          </div>
        </div>

        {/* Editor area / Preview */}
        {preview ? (
          <div className="p-6 min-h-[400px]">
            <div className="mx-auto max-w-[600px] rounded-2xl overflow-hidden border border-white/[0.06]" style={{ background: "#08080d" }}>
              <div style={{ padding: "20px" }}>
                <div style={{ maxWidth: 600, margin: "0 auto", background: "#0d0d12", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ height: 3, background: "linear-gradient(90deg,#b249f8,#f649a7,#b249f8)" }} />
                  <div style={{ padding: 32 }}>
                    <h1 style={{ color: "#fff", fontSize: 22, margin: "0 0 24px", fontWeight: 700 }}>{subject || "Email Subject"}</h1>
                    <div
                      className="email-preview-body"
                      style={{ color: "#d0d0e0", fontSize: 14, lineHeight: 1.7 }}
                      dangerouslySetInnerHTML={{ __html: getEditorHtml() || "<p style='color:#4a4a5a'>Email body will appear here...</p>" }}
                    />
                    <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <span style={{ color: "#b249f8", fontSize: 13, fontWeight: 500 }}>SudoSell</span>
                      <p style={{ color: "#4a4a5a", fontSize: 11, margin: "8px 0 0" }}>You received this because you subscribed to SudoSell updates.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="min-h-[400px] p-6 text-sm text-[#d0d0e0] leading-relaxed outline-none focus:outline-none [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mb-2 [&_p]:mb-2 [&_a]:text-[#b249f8] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2 [&_li]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-[#b249f8] [&_blockquote]:pl-4 [&_blockquote]:text-[#9898ac] [&_blockquote]:mb-2 [&_pre]:bg-white/[0.03] [&_pre]:border [&_pre]:border-white/[0.06] [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:mb-2 [&_pre]:font-mono [&_pre]:text-xs [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-3 [&_hr]:border-white/[0.06] [&_hr]:my-4"
            data-placeholder="Start writing your email..."
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#4a4a5a]">
          {recipientMode === "all" ? "This will be sent to all newsletter subscribers" : "This will be sent to one recipient"}
        </p>
        <div className="flex gap-3">
          <button
            onClick={resetForm}
            className="px-4 py-2.5 rounded-lg border border-white/[0.06] text-sm font-medium text-[#9898ac] hover:text-white hover:bg-white/[0.04] transition-all duration-150"
          >
            <X size={14} className="inline mr-1.5 -mt-0.5" />
            Discard
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !subject.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#b249f8] text-white text-sm font-medium hover:bg-[#9333ea] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={14} />
            {recipientMode === "all" ? "Send to All" : "Send Email"}
          </button>
        </div>
      </div>

      <style jsx global>{`
        [data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: #4a4a5a;
          pointer-events: none;
        }
        .email-preview-body h1 { color: #fff; font-size: 20px; font-weight: 700; margin: 0 0 16px; }
        .email-preview-body h2 { color: #fff; font-size: 17px; font-weight: 600; margin: 0 0 12px; }
        .email-preview-body p { margin: 0 0 12px; }
        .email-preview-body a { color: #b249f8; }
        .email-preview-body ul, .email-preview-body ol { padding-left: 20px; margin: 0 0 12px; }
        .email-preview-body blockquote { border-left: 3px solid #b249f8; padding-left: 12px; color: #9898ac; margin: 0 0 12px; }
        .email-preview-body img { max-width: 100%; border-radius: 8px; margin: 12px 0; }
        .email-preview-body hr { border-color: rgba(255,255,255,0.06); margin: 16px 0; }
        .email-preview-body pre { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px; font-family: monospace; font-size: 12px; }
      `}</style>
    </div>
  );
}
