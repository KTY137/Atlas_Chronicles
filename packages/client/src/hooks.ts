import { useCallback, useEffect, useState } from "react";
import { api, errorText } from "./api";

export function useResource<T>(path: string | null, revision = 0, interval = 0) {
  const [state, setState] = useState<{ path: string | null; data: T | null; loading: boolean; error: string }>({ path, data: null, loading: !!path, error: "" });
  useEffect(() => {
    if (!path) { setState({ path, data: null, loading: false, error: "" }); return; }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Keep mounted controls intact while refreshing the same resource.
    setState(current => current.path === path && current.data !== null
      ? { ...current, loading: false, error: "" }
      : { path, data: null, loading: true, error: "" });
    const load = async () => {
      try { const data = await api<T>(path, { signal: controller.signal }); if (!controller.signal.aborted) setState({ path, data, loading: false, error: "" }); }
      catch (error) { if (!controller.signal.aborted) setState({ path, data: null, loading: false, error: errorText(error) }); }
      if (interval && !controller.signal.aborted) timer = setTimeout(load, interval);
    };
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [path, revision, interval]);
  return state.path === path ? state : { path, data: null, loading: !!path, error: "" };
}

export function useTask() {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const run = useCallback(async (work: () => Promise<void>) => {
    setBusy(true); setError("");
    try { await work(); } catch (error) { setError(errorText(error)); } finally { setBusy(false); }
  }, []);
  return { busy, error, setError, run };
}
