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
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            IPOP Systems
          </h1>
          <nav className="flex items-center gap-4">
            <a
              href="/settings/ai"
              className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              AI Settings
            </a>
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Sign Out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Welcome, {session?.user?.name ?? session?.user?.email}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your AI email drafting context and Gmail integration.
          </p>
        </div>

        {/* Gmail Auto-Draft Toggle */}
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Gmail Auto-Drafting
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
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
            className="rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Company Profile
              </span>
              <span
                className={`h-2 w-2 rounded-full ${hasSettings ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"}`}
              />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {hasSettings
                ? settings?.companyName ?? "Configured"
                : "Not configured yet"}
            </p>
          </a>

          <a
            href="/settings/ai"
            className="rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Writing Style
              </span>
              <span
                className={`h-2 w-2 rounded-full ${hasWritingStyle ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"}`}
              />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {hasWritingStyle
                ? `Tone: ${settings?.writingTone ?? "Custom"}`
                : "Not configured yet"}
            </p>
          </a>

          <a
            href="/settings/ai"
            className="rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Reference Files
              </span>
              <span
                className={`h-2 w-2 rounded-full ${fileCount > 0 ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"}`}
              />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
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
