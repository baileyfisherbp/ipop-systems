import { auth } from "@/lib/auth";
import { signOutAction } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();

  const [settings, fileCount] = await Promise.all([
    prisma.companySettings.findUnique({ where: { id: "default" } }),
    prisma.contextFile.count(),
  ]);

  const hasSettings = !!(settings?.companyName || settings?.companyDescription);
  const hasWritingStyle = !!(settings?.writingTone || settings?.writingStyle);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            IPOP Systems
          </h1>
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Welcome, {session?.user?.name ?? session?.user?.email}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Configure your AI context so emails drafted in Gmail reflect your
            company, tone, and expertise.
          </p>
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

        {/* Quick Actions */}
        <div className="mt-8">
          <a
            href="/settings/ai"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Configure AI Context
          </a>
        </div>

        {/* Info */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            How it works
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
            <li>
              1. Set up your company profile, writing style, and upload
              reference documents here.
            </li>
            <li>
              2. The AI context is automatically used when drafting emails in
              Gmail.
            </li>
            <li>
              3. Emails are personalized with your real services, tone, and
              expertise.
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
