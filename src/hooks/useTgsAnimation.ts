import { useEffect, useState } from "react";
import { ungzip } from "pako";

interface TgsState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

export function useTgsAnimation<T = unknown>(url?: string): TgsState<T> {
  const [state, setState] = useState<TgsState<T>>({
    data: null,
    isLoading: Boolean(url),
    error: null,
  });

  useEffect(() => {
    if (!url) {
      setState({ data: null, isLoading: false, error: null });
      return;
    }

    let isCancelled = false;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load animation: ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        const decoded = ungzip(new Uint8Array(buffer));
        const text = new TextDecoder("utf-8").decode(decoded);
        return JSON.parse(text) as T;
      })
      .then((data) => {
        if (!isCancelled) {
          setState({ data, isLoading: false, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!isCancelled) {
          const normalized = error instanceof Error ? error : new Error(String(error));
          setState({ data: null, isLoading: false, error: normalized });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [url]);

  return state;
}
