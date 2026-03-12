import { auth } from "@/lib/auth";
import { signOutAction } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import GmailWatchToggle from "./gmail-watch-toggle";
import RecentDrafts from "./recent-drafts";

export default async function DashboardPage() {
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
          take: 10,
        })
      : [],
  ]);

  const hasSettings = !!(settings?.companyName || settings?.companyDescription);
  const hasWritingStyle = !!(settings?.writingTone || settings?.writingStyle);
  const watchActive = watch?.active && new Date() < (watch?.expiration ?? new Date(0));

  return (
    <div className="min-h-screen bg-dm-bg">
      {/* Header */}
      <header className="border-b border-dm-border bg-dm-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <h1 className="text-lg font-semibold text-dm-text">
            IPOP Systems
          </h1>
          <nav className="flex items-center gap-4">
            <a
              href="/settings/ai"
              className="text-sm text-dm-text-muted transition-colors duration-150 hover:text-dm-text"
            >
              AI Settings
            </a>
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-sm text-dm-text-muted transition-colors duration-150 hover:text-dm-text"
              >
                Sign Out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dm-text">
            Welcome, {session?.user?.name ?? session?.user?.email}
          </h2>
          <p className="mt-1 text-sm text-dm-text-muted">
            Manage your AI email drafting context and Gmail integration.
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
                  ? "Active — incoming emails get AI-drafted replies saved to your Drafts folder"
                  : "Disabled — enable to automatically draft replies to incoming emails"}
              </p>
            </div>
            <GmailWatchToggle initialActive={!!watchActive} />
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <a
            href="/settings/ai"
            className="rounded-2xl border border-dm-border bg-dm-surface p-5 transition-colors duration-150 hover:border-dm-border"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-dm-text">
                Company Profile
              </span>
              <span
                className={`h-2 w-2 rounded-full ${hasSettings ? "bg-green-500" : "bg-dm-border"}`}
              />
            </div>
            <p className="text-xs text-dm-text-muted">
              {hasSettings
                ? settings?.companyName ?? "Configured"
                : "Not configured yet"}
            </p>
          </a>

          <a
            href="/settings/ai"
            className="rounded-2xl border border-dm-border bg-dm-surface p-5 transition-colors duration-150 hover:border-dm-border"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-dm-text">
                Writing Style
              </span>
              <span
                className={`h-2 w-2 rounded-full ${hasWritingStyle ? "bg-green-500" : "bg-dm-border"}`}
              />
            </div>
            <p className="text-xs text-dm-text-muted">
              {hasWritingStyle
                ? `Tone: ${settings?.writingTone ?? "Custom"}`
                : "Not configured yet"}
            </p>
          </a>

          <a
            href="/settings/ai"
            className="rounded-2xl border border-dm-border bg-dm-surface p-5 transition-colors duration-150 hover:border-dm-border"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-dm-text">
                Reference Files
              </span>
              <span
                className={`h-2 w-2 rounded-full ${fileCount > 0 ? "bg-green-500" : "bg-dm-border"}`}
              />
            </div>
            <p className="text-xs text-dm-text-muted">
              {fileCount > 0
                ? `${fileCount} file${fileCount > 1 ? "s" : ""} uploaded`
                : "No files uploaded"}
            </p>
          </a>
        </div>

        {/* Recent Drafts */}
        <RecentDrafts drafts={recentDrafts} />
      </main>
    </div>
  );
}
