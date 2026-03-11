import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
    <>
      {children}
      <SpeedInsights />
    </>
  );
}
