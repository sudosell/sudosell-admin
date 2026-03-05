"use client";

import { useState, useRef, useCallback } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, Trash2, FileDown } from "lucide-react";
import Modal from "@/components/Modal";
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
  tebexPackageId: number;
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteProduct, setShowDeleteProduct] = useState(false);

  const handleUpload = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !version.trim()) return;
    setUploading(true);

    const formData = new FormData();
    formData.set("version", version);
    formData.set("patchNotes", patchNotes);
    formData.set("file", file);

    const res = await fetch(`/api/products/${id}/releases`, { method: "POST", body: formData });
    if (res.ok) {
      const release = await res.json();
      setProduct((p) => p ? { ...p, releases: [release, ...p.releases] } : p);
      setVersion("");
      setPatchNotes("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    }
    setUploading(false);
  }, [file, version, patchNotes, id, setProduct]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/products/${id}/releases/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      setProduct((p) => p ? { ...p, releases: p.releases.filter((r) => r.id !== deleteId) } : p);
    }
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
      <Link href="/products" className="text-sm text-[#9898ac] hover:text-white transition-colors duration-150 mb-4 inline-block">&larr; Back to Products</Link>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-6 mb-6 animate-in">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">{product.name}</h2>
            <p className="text-sm text-[#9898ac]">Tebex Package ID: <span className="font-mono tabular-nums">{product.tebexPackageId}</span></p>
            <p className="text-xs text-[#4a4a5a] mt-1">Created {new Date(product.createdAt).toLocaleDateString()}</p>
          </div>
          <button
            onClick={() => setShowDeleteProduct(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all duration-150"
          >
            <Trash2 size={14} />
            Delete Product
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5 mb-6 animate-in" style={{ animationDelay: "50ms" }}>
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Upload size={16} /> Upload Release
        </h3>
        <form onSubmit={handleUpload} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#9898ac] mb-1">Version</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0.0"
                required
                className="w-full px-3 py-2 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white placeholder-[#4a4a5a] focus:outline-none focus:border-[#b249f8]/30 transition-colors duration-150"
              />
            </div>
            <div>
              <label className="block text-xs text-[#9898ac] mb-1">File</label>
              <input
                ref={fileRef}
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
                className="w-full px-3 py-1.5 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-[#9898ac] file:mr-3 file:border-0 file:bg-[#b249f8]/10 file:text-[#b249f8] file:rounded file:px-2 file:py-1 file:text-xs file:font-medium file:cursor-pointer"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#9898ac] mb-1">Patch Notes (optional)</label>
            <textarea
              value={patchNotes}
              onChange={(e) => setPatchNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white placeholder-[#4a4a5a] resize-none focus:outline-none focus:border-[#b249f8]/30 transition-colors duration-150"
            />
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#b249f8] text-white hover:bg-[#9333ea] disabled:opacity-50 transition-all duration-150"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
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
                <button
                  onClick={() => setDeleteId(r.id)}
                  className="p-2 rounded-lg text-[#9898ac] hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Release"
        actions={
          <>
            <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-lg text-sm text-[#9898ac] hover:text-white transition-colors duration-150">Cancel</button>
            <button onClick={handleDelete} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors duration-150">Delete</button>
          </>
        }
      >
        <p>Are you sure you want to delete this release? This will also remove the file from storage.</p>
      </Modal>

      <Modal
        open={showDeleteProduct}
        onClose={() => setShowDeleteProduct(false)}
        title="Delete Product"
        actions={
          <>
            <button onClick={() => setShowDeleteProduct(false)} className="px-4 py-2 rounded-lg text-sm text-[#9898ac] hover:text-white transition-colors duration-150">Cancel</button>
            <button onClick={handleDeleteProduct} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors duration-150">Delete</button>
          </>
        }
      >
        <p>Are you sure you want to delete <strong className="text-white">{product.name}</strong>? This will also delete all releases. This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
