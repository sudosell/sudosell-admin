"use client";

import { useState, useRef, useCallback } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, FileDown, Pencil } from "lucide-react";
import Modal from "@/components/Modal";
import Breadcrumb from "@/components/Breadcrumb";
import { DetailSkeleton } from "@/components/Skeleton";
import { useFetch } from "@/lib/hooks";

interface Release {
  id: string;
  version: string;
  patchNotes: string | null;
  fileName: string;
  fileSize: number | null;
  createdAt: string;
}

interface ProductDetail {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  paddleProductId: string;
  createdAt: string;
  releases: Release[];
}

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: product, loading, setData: setProduct } = useFetch<ProductDetail>(`/api/products/${id}`);

  const [version, setVersion] = useState("");
  const [patchNotes, setPatchNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteProduct, setShowDeleteProduct] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const startEditing = useCallback(() => {
    if (!product) return;
    setEditName(product.name);
    setEditDescription(product.description ?? "");
    setEditImageUrl(product.imageUrl ?? "");
    setEditing(true);
  }, [product]);

  const saveEdit = useCallback(async () => {
    if (!product || saving) return;
    setSaving(true);
    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, description: editDescription, imageUrl: editImageUrl }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProduct((p) => p ? { ...p, ...updated } : p);
      setEditing(false);
    }
    setSaving(false);
  }, [product, id, editName, editDescription, editImageUrl, saving, setProduct]);

  const handleUpload = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !version.trim()) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadSpeed("");

    try {
      const presignRes = await fetch(`/api/products/${id}/releases/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });

      if (!presignRes.ok) {
        setUploading(false);
        return;
      }

      const { uploadUrl, fileKey } = await presignRes.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let startTime = Date.now();
        let lastLoaded = 0;

        xhr.upload.addEventListener("progress", (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.round((ev.loaded / ev.total) * 100);
            setUploadProgress(pct);

            const now = Date.now();
            const elapsed = (now - startTime) / 1000;
            if (elapsed > 0.5) {
              const bytesPerSec = (ev.loaded - lastLoaded) / ((now - startTime) / 1000);
              lastLoaded = ev.loaded;
              startTime = now;
              if (bytesPerSec > 1048576) setUploadSpeed(`${(bytesPerSec / 1048576).toFixed(1)} MB/s`);
              else if (bytesPerSec > 1024) setUploadSpeed(`${(bytesPerSec / 1024).toFixed(0)} KB/s`);
              else setUploadSpeed(`${Math.round(bytesPerSec)} B/s`);
            }
          }
        });

        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject();
        xhr.onerror = () => reject();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.send(file);
      });

      setUploadProgress(100);
      setUploadSpeed("Saving...");

      const confirmRes = await fetch(`/api/products/${id}/releases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version,
          patchNotes: patchNotes || null,
          fileKey,
          fileName: file.name,
          fileSize: file.size,
        }),
      });

      if (confirmRes.ok) {
        const release = await confirmRes.json();
        setProduct((p) => p ? { ...p, releases: [release, ...p.releases] } : p);
        setVersion("");
        setPatchNotes("");
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
      }
    } catch {
    }

    setUploading(false);
    setUploadProgress(0);
    setUploadSpeed("");
  }, [file, version, patchNotes, id, setProduct]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/products/${id}/releases/${deleteId}`, { method: "DELETE" });
    if (res.ok) setProduct((p) => p ? { ...p, releases: p.releases.filter((r) => r.id !== deleteId) } : p);
    setDeleteId(null);
  }, [deleteId, id, setProduct]);

  const handleDeleteProduct = useCallback(async () => {
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/products");
  }, [id, router]);

  if (loading) return <DetailSkeleton />;
  if (!product) return <div className="text-sm text-red-400 animate-in">Product not found</div>;

  return (
    <div>
      <Breadcrumb items={[{ label: "Products", href: "/products" }, { label: product.name }]} />

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-6 mb-6 animate-in">
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[#9898ac] mb-1">Name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white focus:outline-none focus:border-[#b249f8]/30 transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-[#9898ac] mb-1">Description</label>
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white resize-none focus:outline-none focus:border-[#b249f8]/30 transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-[#9898ac] mb-1">Image URL</label>
              <input type="url" value={editImageUrl} onChange={(e) => setEditImageUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white focus:outline-none focus:border-[#b249f8]/30 transition-colors" />
            </div>
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-[#b249f8] text-white hover:bg-[#9333ea] disabled:opacity-50 transition-all duration-150">{saving ? "Saving..." : "Save"}</button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg text-sm text-[#9898ac] hover:text-white transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              {product.imageUrl && (
                <img src={product.imageUrl} alt={product.name} className="w-16 h-16 rounded-xl object-cover border border-white/[0.06]" />
              )}
              <div>
                <h2 className="text-xl font-bold text-white mb-1">{product.name}</h2>
                {product.description && <p className="text-sm text-[#9898ac] mb-2">{product.description}</p>}
                <p className="text-sm text-[#9898ac]">Paddle Product ID: <span className="font-mono tabular-nums">{product.paddleProductId}</span></p>
                <p className="text-xs text-[#4a4a5a] mt-1">Created {new Date(product.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={startEditing} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04] transition-all duration-150"><Pencil size={14} />Edit</button>
              <button onClick={() => setShowDeleteProduct(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all duration-150"><Trash2 size={14} />Delete</button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5 mb-6 animate-in" style={{ animationDelay: "50ms" }}>
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Upload size={16} /> Upload Release</h3>
        <form onSubmit={handleUpload} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#9898ac] mb-1">Version</label>
              <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" required className="w-full px-3 py-2 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white placeholder-[#4a4a5a] focus:outline-none focus:border-[#b249f8]/30 transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-[#9898ac] mb-1">File</label>
              <input ref={fileRef} type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required className="w-full px-3 py-1.5 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-[#9898ac] file:mr-3 file:border-0 file:bg-[#b249f8]/10 file:text-[#b249f8] file:rounded file:px-2 file:py-1 file:text-xs file:font-medium file:cursor-pointer" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#9898ac] mb-1">Patch Notes (optional)</label>
            <textarea value={patchNotes} onChange={(e) => setPatchNotes(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white resize-none focus:outline-none focus:border-[#b249f8]/30 transition-colors" />
          </div>
          {uploading ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9898ac]">Uploading... {uploadProgress}%</span>
                {uploadSpeed && <span className="text-[#4a4a5a] tabular-nums">{uploadSpeed}</span>}
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full bg-[#b249f8] transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          ) : (
            <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium bg-[#b249f8] text-white hover:bg-[#9333ea] transition-all duration-150">Upload</button>
          )}
        </form>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5 animate-in" style={{ animationDelay: "100ms" }}>
        <h3 className="text-sm font-semibold text-white mb-4">Releases ({product.releases.length})</h3>
        {product.releases.length === 0 ? (
          <p className="text-sm text-[#9898ac]">No releases yet</p>
        ) : (
          <div className="space-y-3">
            {product.releases.map((r, i) => (
              <div key={r.id} className="flex items-center justify-between p-4 rounded-xl border border-white/[0.04] hover:bg-white/[0.02] transition-colors duration-100 animate-in" style={{ animationDelay: `${i * 40}ms` }}>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-medium text-white">v{r.version}</span>
                    <span className="text-xs text-[#4a4a5a] tabular-nums">{formatSize(r.fileSize)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#9898ac]">
                    <span className="flex items-center gap-1"><FileDown size={12} /> {r.fileName}</span>
                    <span className="tabular-nums">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  {r.patchNotes && <p className="text-xs text-[#4a4a5a] mt-1">{r.patchNotes}</p>}
                </div>
                <button onClick={() => setDeleteId(r.id)} className="p-2 rounded-lg text-[#9898ac] hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Release" actions={<><button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-lg text-sm text-[#9898ac] hover:text-white transition-colors">Cancel</button><button onClick={handleDelete} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors">Delete</button></>}>
        <p>Are you sure you want to delete this release? This will also remove the file from storage.</p>
      </Modal>
      <Modal open={showDeleteProduct} onClose={() => setShowDeleteProduct(false)} title="Delete Product" actions={<><button onClick={() => setShowDeleteProduct(false)} className="px-4 py-2 rounded-lg text-sm text-[#9898ac] hover:text-white transition-colors">Cancel</button><button onClick={handleDeleteProduct} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors">Delete</button></>}>
        <p>Are you sure you want to delete <strong className="text-white">{product.name}</strong>? This will also delete all releases. This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
