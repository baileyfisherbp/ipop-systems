import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SidebarWrapper } from "./sidebar-wrapper";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await auth();
  } catch {
    redirect("/login");
  }
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarWrapper
        userRole={session.user?.role as string | undefined}
        userName={session.user?.name ?? "User"}
        userEmail={session.user?.email ?? ""}
      />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
      <SpeedInsights />
    </div>
  );
}
