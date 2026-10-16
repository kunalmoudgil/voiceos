export function canShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function shareText(title: string, text: string): Promise<{ ok: boolean; message: string }> {
  if (!canShare()) {
    return { ok: false, message: "Native share is not supported in this browser." };
  }
  try {
    await navigator.share({ title, text });
    return { ok: true, message: "Shared" };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, message: "Share canceled." };
    }
    return { ok: false, message: err instanceof Error ? err.message : "Share failed." };
  }
}
