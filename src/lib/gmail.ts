import { prisma } from "@/lib/prisma";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";

/**
 * Get a valid access token for a user, refreshing if expired.
 */
export async function getGmailAccessToken(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account) throw new Error("No Google account linked for this user");

  // Check if token is still valid (with 60s buffer)
  const expiresAt = account.expires_at ?? 0;
  const isExpired = Date.now() / 1000 > expiresAt - 60;

  if (!isExpired && account.access_token) {
    return account.access_token;
  }

  // Refresh the token
  if (!account.refresh_token) {
    throw new Error("No refresh token available — user must re-authenticate");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID!,
      client_secret: process.env.AUTH_GOOGLE_SECRET!,
      refresh_token: account.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  const tokens = await res.json();

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: tokens.access_token,
      expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
    },
  });

  return tokens.access_token;
}

/**
 * Fetch the user's Gmail profile (email address).
 */
export async function getGmailProfile(
  accessToken: string
): Promise<{ emailAddress: string }> {
  const res = await fetch(`${GMAIL_API}/users/me/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Gmail profile fetch failed: ${res.status}`);
  return res.json();
}

/**
 * List history changes since a given historyId.
 */
export async function listHistory(
  accessToken: string,
  startHistoryId: string
): Promise<{
  history: Array<{
    id: string;
    messagesAdded?: Array<{ message: { id: string; threadId: string; labelIds?: string[] } }>;
  }>;
  historyId: string;
}> {
  const url = new URL(`${GMAIL_API}/users/me/history`);
  url.searchParams.set("startHistoryId", startHistoryId);
  url.searchParams.set("historyTypes", "messageAdded");
  url.searchParams.set("labelId", "INBOX");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    // 404 means historyId is too old — need to re-watch
    if (res.status === 404) {
      return { history: [], historyId: startHistoryId };
    }
    throw new Error(`Gmail history fetch failed: ${res.status}`);
  }

  return res.json();
}

interface GmailMessagePayload {
  headers: Array<{ name: string; value: string }>;
  mimeType: string;
  body?: { data?: string; size: number };
  parts?: GmailMessagePayload[];
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: GmailMessagePayload;
}

/**
 * Fetch a full Gmail message by ID.
 */
export async function getMessage(
  accessToken: string,
  messageId: string
): Promise<GmailMessage> {
  const res = await fetch(
    `${GMAIL_API}/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Gmail message fetch failed: ${res.status}`);
  return res.json();
}

/**
 * Extract headers from a Gmail message.
 */
export function getHeader(
  message: GmailMessage,
  name: string
): string | undefined {
  return message.payload.headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  )?.value;
}

/**
 * Decode base64url-encoded Gmail body.
 */
function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * Extract the plain text body from a Gmail message.
 */
export function extractBody(message: GmailMessage): string {
  function findTextPart(payload: GmailMessagePayload): string | null {
    if (payload.mimeType === "text/plain" && payload.body?.data) {
      return decodeBase64Url(payload.body.data);
    }
    if (payload.parts) {
      for (const part of payload.parts) {
        const result = findTextPart(part);
        if (result) return result;
      }
    }
    return null;
  }

  return findTextPart(message.payload) ?? message.snippet ?? "";
}

/**
 * Create a Gmail draft reply to a message.
 */
export async function createGmailDraft(
  accessToken: string,
  params: {
    to: string;
    subject: string;
    body: string;
    threadId: string;
    inReplyTo: string;
    references: string;
  }
): Promise<{ id: string; message: { id: string; threadId: string } }> {
  // Build RFC 2822 message
  const rawParts = [
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    `In-Reply-To: ${params.inReplyTo}`,
    `References: ${params.references}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    "",
    params.body,
  ];
  const raw = Buffer.from(rawParts.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch(`${GMAIL_API}/users/me/drafts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: { raw, threadId: params.threadId },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail draft creation failed: ${res.status} — ${err}`);
  }

  return res.json();
}

/**
 * Register Gmail push notifications via Pub/Sub.
 */
export async function watchMailbox(
  accessToken: string,
  topicName: string
): Promise<{ historyId: string; expiration: string }> {
  const res = await fetch(`${GMAIL_API}/users/me/watch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topicName,
      labelIds: ["INBOX"],
      labelFilterBehavior: "INCLUDE",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail watch failed: ${res.status} — ${err}`);
  }

  return res.json();
}

/**
 * Stop Gmail push notifications.
 */
export async function stopWatch(accessToken: string): Promise<void> {
  await fetch(`${GMAIL_API}/users/me/stop`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/**
 * Check if an email should get an auto-draft (skip newsletters, noreply, etc.).
 */
export function shouldDraftReply(message: GmailMessage): boolean {
  const from = getHeader(message, "From")?.toLowerCase() ?? "";
  const labels = message.labelIds ?? [];

  // Skip if sent by the user themselves
  if (labels.includes("SENT")) return false;

  // Skip common noreply / automated senders
  const skipPatterns = [
    "noreply",
    "no-reply",
    "donotreply",
    "mailer-daemon",
    "notifications@",
    "newsletter",
    "unsubscribe",
    "updates@",
    "alerts@",
    "support@github.com",
    "notify@",
  ];
  if (skipPatterns.some((p) => from.includes(p))) return false;

  // Skip if it's a calendar invite
  const contentType = getHeader(message, "Content-Type") ?? "";
  if (contentType.includes("calendar")) return false;

  // Skip promotions and social
  if (labels.includes("CATEGORY_PROMOTIONS")) return false;
  if (labels.includes("CATEGORY_SOCIAL")) return false;
  if (labels.includes("CATEGORY_UPDATES")) return false;
  if (labels.includes("CATEGORY_FORUMS")) return false;

  return true;
}
