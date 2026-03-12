import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDriveClient } from "@/lib/google";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const drive = await getDriveClient(session.user.id);

    const res = await drive.files.list({
      pageSize: 50,
      fields: "files(id, name, mimeType, modifiedTime, webViewLink)",
      orderBy: "modifiedTime desc",
    });

    return NextResponse.json(res.data.files || []);
  } catch (error: unknown) {
    console.error("Drive API error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
