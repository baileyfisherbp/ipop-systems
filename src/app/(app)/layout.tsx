import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Syne, DM_Sans, DM_Mono } from "next/font/google";
import { SidebarWrapper } from "./sidebar-wrapper";

const syne = Syne({ variable: "--font-syne", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const dmMono = DM_Mono({ variable: "--font-dm-mono", weight: ["400", "500"], subsets: ["latin"] });

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
    <div className={`${syne.variable} ${dmSans.variable} ${dmMono.variable} flex h-screen overflow-hidden`}>
      <SidebarWrapper
        userRole={session.user?.role as string | undefined}
        userName={session.user?.name ?? "User"}
        userEmail={session.user?.email ?? ""}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <SpeedInsights />
    </div>
  );
}
