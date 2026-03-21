"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import {
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
  Upload,
} from "lucide-react";

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

export default function NewProductPage() {
  const router = useRouter();

  // Basic info
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [shortDescription, setShortDescription] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");

  // Paddle
  const [paddleProductId, setPaddleProductId] = useState("");
  const [paddlePriceId, setPaddlePriceId] = useState("");
  const [price, setPrice] = useState("");

  // Description (rich text)
  const editorRef = useRef<HTMLDivElement>(null);

  // Media
  const [heroImage, setHeroImage] = useState("");
  const [heroImageUploading, setHeroImageUploading] = useState(false);
  const [galleryImages, setGalleryImages] = useState<{ url: string; name: string }[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Features & Tags
  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Form state
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // We need a temporary product ID for image uploads before the product is created
  const [tempId] = useState(() => `temp-${Date.now()}`);

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManual) {
      setSlug(slugify(name));
    }
  }, [name, slugManual]);

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
        const file = input.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await fetch(`/api/products/${tempId}/images`, {
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
  }, [tempId]);

  // Hero image upload
  const uploadHeroImage = useCallback(async (file: File) => {
    setHeroImageUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`/api/products/${tempId}/images`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const { url } = await res.json();
        setHeroImage(url);
      }
    } catch {
      // ignore
    }
    setHeroImageUploading(false);
  }, [tempId]);

  // Gallery image upload
  const uploadGalleryImages = useCallback(async (files: FileList) => {
    setGalleryUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch(`/api/products/${tempId}/images`, {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const { url } = await res.json();
          setGalleryImages((prev) => [...prev, { url, name: file.name }]);
        }
      } catch {
        // ignore
      }
    }
    setGalleryUploading(false);
  }, [tempId]);

  // Add feature
  const addFeature = useCallback(() => {
    const val = featureInput.trim();
    if (val && !features.includes(val)) {
      setFeatures((prev) => [...prev, val]);
      setFeatureInput("");
    }
  }, [featureInput, features]);

  // Add tag
  const addTag = useCallback(() => {
    const val = tagInput.trim();
    if (val && !tags.includes(val)) {
      setTags((prev) => [...prev, val]);
      setTagInput("");
    }
  }, [tagInput, tags]);

  // Submit
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const description = editorRef.current?.innerHTML || "";

    const body = {
      name,
      slug: slug || undefined,
      paddleProductId,
      paddlePriceId: paddlePriceId || undefined,
      shortDescription: shortDescription || undefined,
      description: description || undefined,
      heroImage: heroImage || undefined,
      galleryImages: galleryImages.length > 0 ? galleryImages : undefined,
      category: category || undefined,
      tags: tags.length > 0 ? tags : undefined,
      features: features.length > 0 ? features : undefined,
      status,
      price: price ? parseFloat(price) : undefined,
      currency: "USD",
    };

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const product = await res.json();
        router.push(`/products/${product.id}`);
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to create product");
        setSaving(false);
      }
    } catch {
      setError("Failed to create product");
      setSaving(false);
    }
  }, [name, slug, paddleProductId, paddlePriceId, shortDescription, heroImage, galleryImages, category, tags, features, status, price, router]);

  const inputClass = "w-full bg-[#08080d] border border-white/[0.06] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#b249f8]/30 transition-colors duration-150 placeholder-[#4a4a5a]";
  const labelClass = "block text-sm text-[#9898ac] mb-1.5";

  return (
    <div>
      <Breadcrumb items={[{ label: "Products", href: "/products" }, { label: "New Product" }]} />

      <div className="max-w-4xl animate-in">
        <h2 className="text-xl font-bold text-white mb-6">Create Product</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 animate-in">{error}</div>
          )}

          {/* Basic Info */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white mb-2">Basic Info</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Product Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="My Awesome SaaS Starter"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugManual(true);
                  }}
                  placeholder="my-awesome-saas-starter"
                  className={inputClass}
                />
                <p className="text-xs text-[#4a4a5a] mt-1">Auto-generated from name. Edit to customize.</p>
              </div>
            </div>

            <div>
              <label className={labelClass}>Short Description</label>
              <textarea
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                rows={2}
                maxLength={200}
                placeholder="Brief description for product cards (~200 chars)"
                className={inputClass + " resize-none"}
              />
              <p className="text-xs text-[#4a4a5a] mt-1">{shortDescription.length}/200</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
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
                    onClick={() => setStatus("draft")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                      status === "draft"
                        ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                        : "border-white/[0.06] text-[#9898ac] hover:text-white"
                    }`}
                  >
                    Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("published")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                      status === "published"
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
            <h3 className="text-sm font-semibold text-white mb-2">Paddle Integration</h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Paddle Product ID *</label>
                <input
                  type="text"
                  value={paddleProductId}
                  onChange={(e) => setPaddleProductId(e.target.value)}
                  required
                  placeholder="pro_01km..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Paddle Price ID</label>
                <input
                  type="text"
                  value={paddlePriceId}
                  onChange={(e) => setPaddlePriceId(e.target.value)}
                  placeholder="pri_01km..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Price (USD)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
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
            <h3 className="text-sm font-semibold text-white mb-2">Media</h3>

            {/* Hero Image */}
            <div>
              <label className={labelClass}>Hero Image</label>
              <div className="flex items-start gap-4">
                {heroImage ? (
                  <div className="relative group">
                    <img
                      src={heroImage}
                      alt="Hero"
                      className="w-40 h-24 object-cover rounded-lg border border-white/[0.06]"
                    />
                    <button
                      type="button"
                      onClick={() => setHeroImage("")}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => heroInputRef.current?.click()}
                  disabled={heroImageUploading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04] transition-all duration-150 disabled:opacity-50"
                >
                  <Upload size={14} />
                  {heroImageUploading ? "Uploading..." : "Upload Hero Image"}
                </button>
                <input
                  ref={heroInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadHeroImage(file);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            {/* Gallery Images */}
            <div>
              <label className={labelClass}>Gallery Images</label>
              <div className="flex flex-wrap gap-3 mb-3">
                {galleryImages.map((img, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-28 h-20 object-cover rounded-lg border border-white/[0.06]"
                    />
                    <button
                      type="button"
                      onClick={() => setGalleryImages((prev) => prev.filter((_, idx) => idx !== i))}
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
            <h3 className="text-sm font-semibold text-white mb-2">Features & Tags</h3>

            {/* Features */}
            <div>
              <label className={labelClass}>Features</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {features.map((f, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#b249f8]/10 text-[#b249f8] border border-[#b249f8]/20"
                  >
                    {f}
                    <button
                      type="button"
                      onClick={() => setFeatures((prev) => prev.filter((_, idx) => idx !== i))}
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
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
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
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04] transition-all duration-150 whitespace-nowrap"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className={labelClass}>Tags</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => setTags((prev) => prev.filter((_, idx) => idx !== i))}
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
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
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
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04] transition-all duration-150 whitespace-nowrap"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 rounded-lg text-sm font-medium bg-[#b249f8] text-white hover:bg-[#9333ea] disabled:opacity-50 transition-all duration-150"
            >
              {saving ? "Creating..." : "Create Product"}
            </button>
          </div>
        </form>
      </div>
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
