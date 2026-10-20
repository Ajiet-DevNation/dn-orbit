import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// human error line from a failed fetch: the API's { error } if present, else the raw body
export async function errorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const body = JSON.parse(text) as { error?: unknown };
    if (typeof body.error === "string" && body.error) return body.error;
  } catch {}
  return text.trim() || `Request failed (${res.status})`;
}

// GitHub serves avatars at any size via `s`; without it the profile image comes
// back at full size (~460px) even when shown at 28px. Other hosts pass through.
export function githubAvatarAt(url: string, px: number): string {
  try {
    const u = new URL(url);
    if (u.hostname !== "avatars.githubusercontent.com") return url;
    u.searchParams.set("s", String(Math.round(px)));
    return u.toString();
  } catch {
    return url;
  }
}
