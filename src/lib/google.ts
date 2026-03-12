import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export async function getGoogleAuth(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account?.access_token || !account?.refresh_token) {
    throw new Error("Google account not connected");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  // Handle token refresh
  oauth2Client.on("tokens", async (tokens) => {
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: tokens.access_token ?? account.access_token,
        expires_at: tokens.expiry_date
          ? Math.floor(tokens.expiry_date / 1000)
          : account.expires_at,
      },
    });
  });

  return oauth2Client;
}

export async function getGmailClient(userId: string) {
  const auth = await getGoogleAuth(userId);
  return google.gmail({ version: "v1", auth });
}

export async function getDriveClient(userId: string) {
  const auth = await getGoogleAuth(userId);
  return google.drive({ version: "v3", auth });
}

export async function getCalendarClient(userId: string) {
  const auth = await getGoogleAuth(userId);
  return google.calendar({ version: "v3", auth });
}
