// Thin wrapper around Tauri's invoke API so it can be mocked in the browser
// during `vite` standalone development (when the Tauri runtime isn't attached).

type Invoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

type TauriGlobal = { core?: { invoke?: Invoke } };

export const invoke: Invoke = async (cmd, args) => {
  const g = (window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__;
  if (g?.core?.invoke) {
    return g.core.invoke(cmd, args);
  }
  throw new Error(`Tauri runtime unavailable — cannot invoke '${cmd}' in browser mode`);
};

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}
