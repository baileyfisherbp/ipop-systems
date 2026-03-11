import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <>
      {children}
      <SpeedInsights />
    </>
  );
}
