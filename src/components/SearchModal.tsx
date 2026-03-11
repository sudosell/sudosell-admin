"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, MessageSquare, ShoppingCart, Package, X } from "lucide-react";
import { useDebounce } from "@/lib/hooks";

interface SearchResults {
  users: Array<{ id: string; name: string; email: string }>;
  tickets: Array<{ id: string; subject: string; status: string }>;
  purchases: Array<{ id: string; transactionId: string | null; status: string; totalPrice: number; user: { name: string } }>;
  products: Array<{ id: string; name: string }>;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SearchModal({ open, onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data) => setResults(data.results))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const navigate = useCallback((href: string) => {
    router.push(href);
    onClose();
  }, [router, onClose]);

  if (!open) return null;

  const hasResults = results && (results.users.length > 0 || results.tickets.length > 0 || results.purchases.length > 0 || results.products.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/[0.06] bg-[#0d0d12] shadow-2xl animate-in overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b border-white/[0.06]">
          <Search size={18} className="text-[#4a4a5a] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, tickets, purchases, products..."
            className="flex-1 py-4 bg-transparent text-sm text-white placeholder-[#4a4a5a] focus:outline-none"
          />
          <button onClick={onClose} className="text-[#4a4a5a] hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-4 text-sm text-[#9898ac]">Searching...</div>
          )}

          {!loading && debouncedQuery.length >= 2 && !hasResults && (
            <div className="p-4 text-sm text-[#9898ac]">No results found</div>
          )}

          {hasResults && (
            <div className="py-2">
              {results.users.length > 0 && (
                <Section icon={Users} label="Users">
                  {results.users.map((u) => (
                    <ResultItem key={u.id} onClick={() => navigate(`/users/${u.id}`)}>
                      <span className="text-white">{u.name}</span>
                      <span className="text-[#4a4a5a] ml-2">{u.email}</span>
                    </ResultItem>
                  ))}
                </Section>
              )}
              {results.tickets.length > 0 && (
                <Section icon={MessageSquare} label="Tickets">
                  {results.tickets.map((t) => (
                    <ResultItem key={t.id} onClick={() => navigate(`/tickets/${t.id}`)}>
                      <span className="text-white">{t.subject}</span>
                      <span className={`ml-2 text-xs ${t.status === "open" ? "text-blue-400" : "text-[#4a4a5a]"}`}>{t.status}</span>
                    </ResultItem>
                  ))}
                </Section>
              )}
              {results.purchases.length > 0 && (
                <Section icon={ShoppingCart} label="Purchases">
                  {results.purchases.map((p) => (
                    <ResultItem key={p.id} onClick={() => navigate(`/purchases/${p.id}`)}>
                      <span className="text-white">{p.user.name}</span>
                      <span className="text-[#4a4a5a] ml-2">£{p.totalPrice.toFixed(2)}</span>
                    </ResultItem>
                  ))}
                </Section>
              )}
              {results.products.length > 0 && (
                <Section icon={Package} label="Products">
                  {results.products.map((p) => (
                    <ResultItem key={p.id} onClick={() => navigate(`/products/${p.id}`)}>
                      <span className="text-white">{p.name}</span>
                    </ResultItem>
                  ))}
                </Section>
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-white/[0.06] flex items-center gap-4 text-[10px] text-[#4a4a5a]">
          <span><kbd className="px-1 py-0.5 rounded bg-white/[0.06] text-[#9898ac]">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-[#9898ac] font-medium">
        <Icon size={12} />
        {label}
      </div>
      {children}
    </div>
  );
}

function ResultItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center px-4 py-2 text-sm hover:bg-white/[0.04] transition-colors duration-100 text-left"
    >
      {children}
    </button>
  );
}
