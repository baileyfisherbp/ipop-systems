import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGmailClient } from "@/lib/google";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const gmail = await getGmailClient(session.user.id);

    // Get recent unread emails from inbox
    const res = await gmail.users.messages.list({
      userId: "me",
      maxResults: 20,
      q: "is:inbox",
    });

    const messages = res.data.messages || [];

    const emails = await Promise.all(
      messages.map(async (msg) => {
        const full = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "full",
        });

        const headers = full.data.payload?.headers || [];
        const from =
          headers.find((h) => h.name === "From")?.value || "Unknown";
        const subject =
          headers.find((h) => h.name === "Subject")?.value || "(no subject)";
        const date = headers.find((h) => h.name === "Date")?.value || "";

        // Extract body
        let body = "";
        const payload = full.data.payload;
        if (payload?.body?.data) {
          body = Buffer.from(payload.body.data, "base64").toString("utf-8");
        } else if (payload?.parts) {
          const textPart = payload.parts.find(
            (p) => p.mimeType === "text/plain"
          );
          if (textPart?.body?.data) {
            body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
          }
        }

        return {
          id: msg.id,
          threadId: full.data.threadId,
          from,
          subject,
          date,
          snippet: full.data.snippet,
          body,
          labelIds: full.data.labelIds,
        };
      })
    );

    return NextResponse.json(emails);
  } catch (error: unknown) {
    console.error("Gmail API error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch emails";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
