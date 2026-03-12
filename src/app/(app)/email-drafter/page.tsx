import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import GmailWatchToggle from "./gmail-watch-toggle";
import RecentDrafts from "./recent-drafts";

export default async function EmailDrafterPage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";

  const [settings, fileCount, watch, recentDrafts] = await Promise.all([
    prisma.companySettings.findUnique({ where: { id: "default" } }),
    prisma.contextFile.count(),
    userId
      ? prisma.gmailWatch.findUnique({ where: { userId } })
      : null,
    userId
      ? prisma.emailDraft.findMany({
          where: { createdById: userId },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : [],
  ]);

  const watchActive =
    watch?.active && new Date() < (watch?.expiration ?? new Date(0));

  const contextSources: string[] = [];
  if (settings?.companyName) contextSources.push("Company profile");
  if (settings?.writingTone || settings?.writingStyle)
    contextSources.push("Writing style");
  if (settings?.skills) contextSources.push("Skills & knowledge");
  if (fileCount > 0)
    contextSources.push(`${fileCount} reference file${fileCount > 1 ? "s" : ""}`);

  return (
    <div className="min-h-full p-6">
      <div className="mx-auto max-w-3xl py-2">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dm-text">
            Email Drafter
          </h2>
          <p className="mt-1 text-sm text-dm-text-muted">
            Automatically draft replies to incoming Gmail messages.
          </p>
        </div>

        {/* Gmail Auto-Draft Toggle */}
        <div className="mb-6 rounded-2xl border border-dm-border bg-dm-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-dm-text">
                Gmail Auto-Drafting
              </h3>
              <p className="mt-0.5 text-xs text-dm-text-muted">
                {watchActive
                  ? "Active — incoming emails get drafted replies saved to your Drafts folder"
                  : "Disabled — enable to automatically draft replies to incoming emails"}
              </p>
            </div>
            <GmailWatchToggle initialActive={!!watchActive} />
          </div>
        </div>

        {/* Context Sources Indicator */}
        <div className="mb-6 rounded-2xl border border-dm-border bg-dm-surface p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-dm-text">
                Drafting Context
              </h3>
              {contextSources.length > 0 ? (
                <p className="mt-1 text-xs text-dm-text-muted">
                  Using:{" "}
                  {contextSources.join(" · ")}
                </p>
              ) : (
                <p className="mt-1 text-xs text-dm-text-muted">
                  No context configured yet — drafts will use generic responses
                </p>
              )}
            </div>
            <a
              href="/settings/ai"
              className="shrink-0 rounded-lg border border-dm-border px-3 py-1.5 text-xs font-medium text-dm-text-muted transition-colors hover:text-dm-text hover:border-dm-text-muted"
            >
              Configure
            </a>
          </div>
        </div>

        {/* Recent Drafts with Feedback */}
        <RecentDrafts drafts={recentDrafts} />
      </div>
    </div>
  );
}
