import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGmailClient } from "@/lib/google";

// PATCH — update draft status (approve/discard)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { status } = await req.json();

  const draft = await prisma.emailDraft.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  // If discarding, delete the Gmail draft too
  if (status === "discarded" && draft.draftGmailId) {
    try {
      const gmail = await getGmailClient(session.user.id);
      await gmail.users.drafts.delete({
        userId: "me",
        id: draft.draftGmailId,
      });
    } catch {
      // Gmail draft may already be gone
    }
  }

  const updated = await prisma.emailDraft.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(updated);
}
