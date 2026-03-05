"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useFetch<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedUrlRef = useRef<string | null>(null);

  const refetch = useCallback(() => {
    if (!url) return;
    setLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [url]);

  useEffect(() => {
    if (!url) return;
    if (loadedUrlRef.current === url) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then((d) => { if (active) { setData(d); loadedUrlRef.current = url; } })
      .catch(console.error)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [url]);

  return { data, loading, setData, refetch };
}

export function useDebounce(value: string, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function useClickOutside(handler: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [handler]);
  return ref;
}

export function usePolling<T>({
  url,
  interval,
  enabled = true,
  onData,
}: {
  url: string | null;
  interval: number;
  enabled?: boolean;
  onData?: (data: T) => void;
}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const onDataRef = useRef(onData);
  onDataRef.current = onData;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doFetch = useCallback(async () => {
    if (!url) return;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      if (onDataRef.current) {
        onDataRef.current(json);
      } else {
        setData(json);
      }
    } catch {
      // ignore polling errors
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (!url || !enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    doFetch();

    const start = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(doFetch, interval);
    };

    const stop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    start();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        doFetch();
        start();
      } else {
        stop();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [url, interval, enabled, doFetch]);

  return { data, loading, refetch: doFetch };
}
