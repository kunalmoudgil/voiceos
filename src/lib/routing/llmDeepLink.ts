// Deep-links the transcript into Claude or ChatGPT's "new chat" composer,
// or falls back to clipboard + a plain new-chat link when the text is too
// long to safely fit in a URL query string across browsers.

const MAX_URL_TEXT_LENGTH = 1800;

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}

export interface DeepLinkOutcome {
  opened: boolean;
  copiedToClipboard: boolean;
  url: string;
}

async function openDeepLink(
  baseUrl: string,
  text: string
): Promise<DeepLinkOutcome> {
  const fitsInUrl = text.length <= MAX_URL_TEXT_LENGTH;
  const url = fitsInUrl ? `${baseUrl}?q=${encodeURIComponent(text)}` : baseUrl;
  let copiedToClipboard = false;

  if (!fitsInUrl) {
    copiedToClipboard = await copyToClipboard(text);
  }

  const win = window.open(url, "_blank", "noopener,noreferrer");
  return { opened: !!win, copiedToClipboard, url };
}

export function openClaude(text: string): Promise<DeepLinkOutcome> {
  return openDeepLink("https://claude.ai/new", text);
}

export function openChatGPT(text: string): Promise<DeepLinkOutcome> {
  return openDeepLink("https://chatgpt.com/", text);
}
