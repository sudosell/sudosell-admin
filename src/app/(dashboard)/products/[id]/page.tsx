"use client";

import { useState, useRef, useCallback } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Trash2,
  FileDown,
  Pencil,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ImageIcon,
  X,
  Plus,
  Check,
  Tag,
  Layers,
  DollarSign,
  Globe,
  Eye,
} from "lucide-react";
import Modal from "@/components/Modal";
import Badge from "@/components/Badge";
import Breadcrumb from "@/components/Breadcrumb";
import { DetailSkeleton } from "@/components/Skeleton";
import { useFetch } from "@/lib/hooks";

const CATEGORIES = [
  "SaaS Starters",
  "Templates",
  "UI Kits",
  "Plugins",
  "Dashboards",
  "Dev Tools",
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface Release {
  id: string;
  version: string;
  patchNotes: string | null;
  fileName: string;
  fileSize: number | null;
  createdAt: string;
}

interface GalleryImage {
  url: string;
  name: string;
}

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  paddleProductId: string;
  paddlePriceId: string | null;
  shortDescription: string | null;
  description: string | null;
  heroImage: string | null;
  galleryImages: GalleryImage[] | null;
  category: string | null;
  tags: string[] | null;
  features: string[] | null;
  status: string;
  price: number | null;
  currency: string;
  createdAt: string;
  releases: Release[];
}

function formatSize(bytes: number | null) {
  if (!bytes) return "\u2014";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: product, loading, setData: setProduct } = useFetch<ProductDetail>(`/api/products/${id}`);

  // Release upload state
  const [version, setVersion] = useState("");
  const [patchNotes, setPatchNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteProduct, setShowDeleteProduct] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editSlugManual, setEditSlugManual] = useState(false);
  const [editShortDescription, setEditShortDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editStatus, setEditStatus] = useState<"draft" | "published">("draft");
  const [editPaddleProductId, setEditPaddleProductId] = useState("");
  const [editPaddlePriceId, setEditPaddlePriceId] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editHeroImage, setEditHeroImage] = useState("");
  const [editGalleryImages, setEditGalleryImages] = useState<GalleryImage[]>([]);
  const [editFeatures, setEditFeatures] = useState<string[]>([]);
  const [editFeatureInput, setEditFeatureInput] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [heroUploading, setHeroUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);

  const startEditing = useCallback(() => {
    if (!product) return;
    setEditName(product.name);
    setEditSlug(product.slug);
    setEditSlugManual(true);
    setEditShortDescription(product.shortDescription ?? "");
    setEditCategory(product.category ?? "");
    setEditStatus((product.status as "draft" | "published") ?? "draft");
    setEditPaddleProductId(product.paddleProductId);
    setEditPaddlePriceId(product.paddlePriceId ?? "");
    setEditPrice(product.price != null ? String(product.price) : "");
    setEditHeroImage(product.heroImage ?? "");
    setEditGalleryImages(product.galleryImages ?? []);
    setEditFeatures(product.features ?? []);
    setEditTags(product.tags ?? []);
    setEditing(true);
    // Set editor content after a tick so the ref is mounted
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = product.description ?? "";
      }
    }, 0);
  }, [product]);

  // Rich text toolbar commands
  const execCmd = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  const insertLink = useCallback(() => {
    const url = prompt("Enter URL:");
    if (url) {
      document.execCommand("createLink", false, url);
      editorRef.current?.focus();
    }
  }, []);

  const insertImage = useCallback(async () => {
    const choice = prompt("Enter image URL, or type 'upload' to upload a file:");
    if (!choice) return;

    if (choice.toLowerCase() === "upload") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async () => {
        const f = input.files?.[0];
        if (!f) return;
        const formData = new FormData();
        formData.append("file", f);
        try {
          const res = await fetch(`/api/products/${id}/images`, {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            const { url } = await res.json();
            document.execCommand("insertImage", false, url);
            editorRef.current?.focus();
          }
        } catch {
          // ignore
        }
      };
      input.click();
    } else {
      document.execCommand("insertImage", false, choice);
      editorRef.current?.focus();
    }
  }, [id]);

  // Hero image upload
  const uploadHeroImage = useCallback(async (f: File) => {
    setHeroUploading(true);
    const formData = new FormData();
    formData.append("file", f);
    try {
      const res = await fetch(`/api/products/${id}/images`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const { url } = await res.json();
        setEditHeroImage(url);
      }
    } catch {
      // ignore
    }
    setHeroUploading(false);
  }, [id]);

  // Gallery image upload
  const uploadGalleryImages = useCallback(async (files: FileList) => {
    setGalleryUploading(true);
    for (const f of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", f);
      try {
        const res = await fetch(`/api/products/${id}/images`, {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const { url } = await res.json();
          setEditGalleryImages((prev) => [...prev, { url, name: f.name }]);
        }
      } catch {
        // ignore
      }
    }
    setGalleryUploading(false);
  }, [id]);

  // Add feature
  const addFeature = useCallback(() => {
    const val = editFeatureInput.trim();
    if (val && !editFeatures.includes(val)) {
      setEditFeatures((prev) => [...prev, val]);
      setEditFeatureInput("");
    }
  }, [editFeatureInput, editFeatures]);

  // Add tag
  const addTag = useCallback(() => {
    const val = editTagInput.trim();
    if (val && !editTags.includes(val)) {
      setEditTags((prev) => [...prev, val]);
      setEditTagInput("");
    }
  }, [editTagInput, editTags]);

  const saveEdit = useCallback(async () => {
    if (!product || saving) return;
    setSaving(true);

    const description = editorRef.current?.innerHTML || "";

    const body = {
      name: editName,
      slug: editSlug,
      paddleProductId: editPaddleProductId,
      paddlePriceId: editPaddlePriceId,
      shortDescription: editShortDescription,
      description,
      heroImage: editHeroImage,
      galleryImages: editGalleryImages,
      category: editCategory,
      tags: editTags,
      features: editFeatures,
      status: editStatus,
      price: editPrice ? parseFloat(editPrice) : null,
    };

    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const updated = await res.json();
      setProduct((p) => (p ? { ...p, ...updated } : p));
      setEditing(false);
    }
    setSaving(false);
  }, [product, id, editName, editSlug, editPaddleProductId, editPaddlePriceId, editShortDescription, editHeroImage, editGalleryImages, editCategory, editTags, editFeatures, editStatus, editPrice, saving, setProduct]);

  // Release upload
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

        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject());
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
        setProduct((p) => (p ? { ...p, releases: [release, ...p.releases] } : p));
        setVersion("");
        setPatchNotes("");
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
      }
    } catch {
      // ignore
    }

    setUploading(false);
    setUploadProgress(0);
    setUploadSpeed("");
  }, [file, version, patchNotes, id, setProduct]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/products/${id}/releases/${deleteId}`, { method: "DELETE" });
    if (res.ok) setProduct((p) => (p ? { ...p, releases: p.releases.filter((r) => r.id !== deleteId) } : p));
    setDeleteId(null);
  }, [deleteId, id, setProduct]);

  const handleDeleteProduct = useCallback(async () => {
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/products");
  }, [id, router]);

  if (loading) return <DetailSkeleton />;
  if (!product) return <div className="text-sm text-red-400 animate-in">Product not found</div>;

  const inputClass = "w-full bg-[#08080d] border border-white/[0.06] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#b249f8]/30 transition-colors duration-150 placeholder-[#4a4a5a]";
  const labelClass = "block text-sm text-[#9898ac] mb-1.5";

  return (
    <div>
      <Breadcrumb items={[{ label: "Products", href: "/products" }, { label: product.name }]} />

      {/* Product Header */}
      {!editing && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-6 mb-6 animate-in">
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              {product.heroImage && (
                <img
                  src={product.heroImage}
                  alt={product.name}
                  className="w-20 h-20 rounded-xl object-cover border border-white/[0.06]"
                />
              )}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-white">{product.name}</h2>
                  <Badge value={product.status} />
                </div>
                {product.shortDescription && (
                  <p className="text-sm text-[#9898ac] mb-2 max-w-xl">{product.shortDescription}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-[#9898ac]">
                  {product.category && (
                    <span className="flex items-center gap-1"><Layers size={12} /> {product.category}</span>
                  )}
                  <span className="flex items-center gap-1 font-mono">
                    <Globe size={12} /> {product.paddleProductId}
                  </span>
                  {product.price != null && (
                    <span className="flex items-center gap-1">
                      <DollarSign size={12} /> ${product.price.toFixed(2)} {product.currency}
                    </span>
                  )}
                  <span className="text-[#4a4a5a] tabular-nums">
                    Created {new Date(product.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={startEditing}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04] transition-all duration-150"
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                onClick={() => setShowDeleteProduct(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all duration-150"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {editing && (
        <div className="space-y-6 mb-6 animate-in">
          {/* Basic Info */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Basic Info</h3>
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#b249f8] text-white hover:bg-[#9333ea] disabled:opacity-50 transition-all duration-150"
                >
                  <Check size={14} />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-lg text-sm text-[#9898ac] hover:text-white border border-white/[0.06] transition-all duration-150"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Product Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Slug</label>
                <input
                  type="text"
                  value={editSlug}
                  onChange={(e) => {
                    setEditSlug(e.target.value);
                    setEditSlugManual(true);
                  }}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Short Description</label>
              <textarea
                value={editShortDescription}
                onChange={(e) => setEditShortDescription(e.target.value)}
                rows={2}
                maxLength={200}
                placeholder="Brief description for product cards (~200 chars)"
                className={inputClass + " resize-none"}
              />
              <p className="text-xs text-[#4a4a5a] mt-1">{editShortDescription.length}/200</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select category...</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <div className="flex items-center gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setEditStatus("draft")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                      editStatus === "draft"
                        ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                        : "border-white/[0.06] text-[#9898ac] hover:text-white"
                    }`}
                  >
                    Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus("published")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                      editStatus === "published"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-white/[0.06] text-[#9898ac] hover:text-white"
                    }`}
                  >
                    Published
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Paddle Integration */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Paddle Integration</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Paddle Product ID *</label>
                <input
                  type="text"
                  value={editPaddleProductId}
                  onChange={(e) => setEditPaddleProductId(e.target.value)}
                  placeholder="pro_01km..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Paddle Price ID</label>
                <input
                  type="text"
                  value={editPaddlePriceId}
                  onChange={(e) => setEditPaddlePriceId(e.target.value)}
                  placeholder="pri_01km..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Price (USD)</label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder="49.99"
                  step="0.01"
                  min="0"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Rich Text Description */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-6">
            <h3 className="text-sm font-semibold text-white mb-3">Description</h3>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 rounded-t-lg border border-white/[0.06] bg-[#08080d] border-b-0">
              <ToolbarButton icon={<Bold size={14} />} onClick={() => execCmd("bold")} title="Bold" />
              <ToolbarButton icon={<Italic size={14} />} onClick={() => execCmd("italic")} title="Italic" />
              <ToolbarButton icon={<Underline size={14} />} onClick={() => execCmd("underline")} title="Underline" />
              <ToolbarButton icon={<Strikethrough size={14} />} onClick={() => execCmd("strikeThrough")} title="Strikethrough" />
              <ToolbarDivider />
              <ToolbarButton icon={<Heading1 size={14} />} onClick={() => execCmd("formatBlock", "h1")} title="Heading 1" />
              <ToolbarButton icon={<Heading2 size={14} />} onClick={() => execCmd("formatBlock", "h2")} title="Heading 2" />
              <ToolbarButton icon={<Heading3 size={14} />} onClick={() => execCmd("formatBlock", "h3")} title="Heading 3" />
              <ToolbarDivider />
              <ToolbarButton icon={<List size={14} />} onClick={() => execCmd("insertUnorderedList")} title="Bullet List" />
              <ToolbarButton icon={<ListOrdered size={14} />} onClick={() => execCmd("insertOrderedList")} title="Numbered List" />
              <ToolbarButton icon={<Quote size={14} />} onClick={() => execCmd("formatBlock", "blockquote")} title="Blockquote" />
              <ToolbarButton icon={<Code size={14} />} onClick={() => execCmd("formatBlock", "pre")} title="Code Block" />
              <ToolbarDivider />
              <ToolbarButton icon={<LinkIcon size={14} />} onClick={insertLink} title="Insert Link" />
              <ToolbarButton icon={<ImageIcon size={14} />} onClick={insertImage} title="Insert Image" />
              <ToolbarButton icon={<Minus size={14} />} onClick={() => execCmd("insertHorizontalRule")} title="Horizontal Divider" />
              <ToolbarDivider />
              <ToolbarButton icon={<AlignLeft size={14} />} onClick={() => execCmd("justifyLeft")} title="Align Left" />
              <ToolbarButton icon={<AlignCenter size={14} />} onClick={() => execCmd("justifyCenter")} title="Align Center" />
              <ToolbarButton icon={<AlignRight size={14} />} onClick={() => execCmd("justifyRight")} title="Align Right" />
            </div>

            {/* Editor area */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-[300px] max-h-[600px] overflow-y-auto p-4 rounded-b-lg border border-white/[0.06] bg-[#08080d] text-sm text-white focus:outline-none focus:border-[#b249f8]/30 transition-colors duration-150 prose prose-invert prose-sm max-w-none [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:text-white [&_h3]:mb-2 [&_p]:text-[#c0c0d0] [&_p]:mb-2 [&_a]:text-[#b249f8] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#b249f8]/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#9898ac] [&_pre]:bg-[#0d0d12] [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:text-[#9898ac] [&_pre]:font-mono [&_pre]:text-xs [&_code]:bg-[#0d0d12] [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[#b249f8] [&_code]:text-xs [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-[#c0c0d0] [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:text-[#c0c0d0] [&_li]:mb-1 [&_hr]:border-white/[0.06] [&_hr]:my-4 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2"
            />
          </div>

          {/* Media */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-6 space-y-5">
            <h3 className="text-sm font-semibold text-white">Media</h3>

            {/* Hero Image */}
            <div>
              <label className={labelClass}>Hero Image</label>
              <div className="flex items-start gap-4">
                {editHeroImage && (
                  <div className="relative group">
                    <img
                      src={editHeroImage}
                      alt="Hero"
                      className="w-40 h-24 object-cover rounded-lg border border-white/[0.06]"
                    />
                    <button
                      type="button"
                      onClick={() => setEditHeroImage("")}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => heroInputRef.current?.click()}
                  disabled={heroUploading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04] transition-all duration-150 disabled:opacity-50"
                >
                  <Upload size={14} />
                  {heroUploading ? "Uploading..." : "Upload Hero Image"}
                </button>
                <input
                  ref={heroInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadHeroImage(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            {/* Gallery Images */}
            <div>
              <label className={labelClass}>Gallery Images</label>
              <div className="flex flex-wrap gap-3 mb-3">
                {editGalleryImages.map((img, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-28 h-20 object-cover rounded-lg border border-white/[0.06]"
                    />
                    <button
                      type="button"
                      onClick={() => setEditGalleryImages((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 rounded-b-lg px-1.5 py-0.5">
                      <p className="text-[10px] text-white/70 truncate">{img.name}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={galleryUploading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04] transition-all duration-150 disabled:opacity-50"
              >
                <Plus size={14} />
                {galleryUploading ? "Uploading..." : "Add Gallery Images"}
              </button>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) uploadGalleryImages(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          {/* Features & Tags */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-6 space-y-5">
            <h3 className="text-sm font-semibold text-white">Features & Tags</h3>

            {/* Features */}
            <div>
              <label className={labelClass}>Features</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {editFeatures.map((f, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#b249f8]/10 text-[#b249f8] border border-[#b249f8]/20"
                  >
                    {f}
                    <button
                      type="button"
                      onClick={() => setEditFeatures((prev) => prev.filter((_, idx) => idx !== i))}
                      className="hover:text-white transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editFeatureInput}
                  onChange={(e) => setEditFeatureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFeature();
                    }
                  }}
                  placeholder="e.g., Full source code"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={addFeature}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04] transition-all duration-150"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className={labelClass}>Tags</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {editTags.map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => setEditTags((prev) => prev.filter((_, idx) => idx !== i))}
                      className="hover:text-white transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editTagInput}
                  onChange={(e) => setEditTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="e.g., Next.js, React, TypeScript"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04] transition-all duration-150"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Save bar (sticky) */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setEditing(false)}
              className="px-6 py-2.5 rounded-lg text-sm text-[#9898ac] hover:text-white border border-white/[0.06] transition-all duration-150"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={saving}
              className="px-8 py-2.5 rounded-lg text-sm font-medium bg-[#b249f8] text-white hover:bg-[#9333ea] disabled:opacity-50 transition-all duration-150"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* Description Preview (when not editing) */}
      {!editing && product.description && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-6 mb-6 animate-in" style={{ animationDelay: "50ms" }}>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Eye size={14} /> Description</h3>
          <div
            className="text-sm prose prose-invert prose-sm max-w-none [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:text-white [&_h3]:mb-2 [&_p]:text-[#c0c0d0] [&_p]:mb-2 [&_a]:text-[#b249f8] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#b249f8]/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#9898ac] [&_pre]:bg-[#08080d] [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:text-[#9898ac] [&_pre]:font-mono [&_pre]:text-xs [&_code]:bg-[#08080d] [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[#b249f8] [&_code]:text-xs [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-[#c0c0d0] [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:text-[#c0c0d0] [&_li]:mb-1 [&_hr]:border-white/[0.06] [&_hr]:my-4 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </div>
      )}

      {/* Features & Tags display (when not editing) */}
      {!editing && ((product.features && product.features.length > 0) || (product.tags && product.tags.length > 0)) && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-6 mb-6 animate-in" style={{ animationDelay: "75ms" }}>
          {product.features && product.features.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Check size={14} /> Features</h3>
              <div className="flex flex-wrap gap-2">
                {product.features.map((f, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#b249f8]/10 text-[#b249f8] border border-[#b249f8]/20"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
          {product.tags && product.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Tag size={14} /> Tags</h3>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gallery preview (when not editing) */}
      {!editing && product.galleryImages && (product.galleryImages as GalleryImage[]).length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-6 mb-6 animate-in" style={{ animationDelay: "100ms" }}>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><ImageIcon size={14} /> Gallery</h3>
          <div className="flex flex-wrap gap-3">
            {(product.galleryImages as GalleryImage[]).map((img, i) => (
              <div key={i} className="relative">
                <img
                  src={img.url}
                  alt={img.name}
                  className="w-40 h-28 object-cover rounded-lg border border-white/[0.06]"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 rounded-b-lg px-2 py-1">
                  <p className="text-[10px] text-white/70 truncate">{img.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Release */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5 mb-6 animate-in" style={{ animationDelay: "125ms" }}>
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
                className="w-full px-3 py-2 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white placeholder-[#4a4a5a] focus:outline-none focus:border-[#b249f8]/30 transition-colors"
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
              className="w-full px-3 py-2 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white resize-none focus:outline-none focus:border-[#b249f8]/30 transition-colors"
            />
          </div>
          {uploading ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9898ac]">Uploading... {uploadProgress}%</span>
                {uploadSpeed && <span className="text-[#4a4a5a] tabular-nums">{uploadSpeed}</span>}
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#b249f8] transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#b249f8] text-white hover:bg-[#9333ea] transition-all duration-150"
            >
              Upload
            </button>
          )}
        </form>
      </div>

      {/* Releases */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5 animate-in" style={{ animationDelay: "150ms" }}>
        <h3 className="text-sm font-semibold text-white mb-4">Releases ({product.releases.length})</h3>
        {product.releases.length === 0 ? (
          <p className="text-sm text-[#9898ac]">No releases yet</p>
        ) : (
          <div className="space-y-3">
            {product.releases.map((r, i) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-4 rounded-xl border border-white/[0.04] hover:bg-white/[0.02] transition-colors duration-100 animate-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-medium text-white">v{r.version}</span>
                    <span className="text-xs text-[#4a4a5a] tabular-nums">{formatSize(r.fileSize)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#9898ac]">
                    <span className="flex items-center gap-1">
                      <FileDown size={12} /> {r.fileName}
                    </span>
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
            <button
              onClick={() => setDeleteId(null)}
              className="px-4 py-2 rounded-lg text-sm text-[#9898ac] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
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
            <button
              onClick={() => setShowDeleteProduct(false)}
              className="px-4 py-2 rounded-lg text-sm text-[#9898ac] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteProduct}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          </>
        }
      >
        <p>
          Are you sure you want to delete <strong className="text-white">{product.name}</strong>? This will also delete
          all releases. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

function ToolbarButton({ icon, onClick, title }: { icon: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-1.5 rounded text-[#9898ac] hover:text-white hover:bg-white/[0.06] transition-all duration-100"
    >
      {icon}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-white/[0.06] mx-1" />;
}
