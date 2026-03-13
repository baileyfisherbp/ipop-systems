import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SchedulingTabs } from "./scheduling-tabs";

export const metadata = { title: "Shift Scheduling — IPOP Systems" };

export default async function SchedulingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = (session.user as any).role as string;
  const isAdmin = role === "ADMIN" || role === "OWNER";

  // Fetch all staff members for the assignment dropdown
  const staff = await prisma.user.findMany({
    select: { id: true, name: true, email: true, image: true },
    orderBy: { name: "asc" },
  });

  const currentUser = staff.find((s) => s.id === session.user!.id);

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-dm-text">
          Shift Scheduling
        </h1>
        <p className="mt-1 text-sm text-dm-text-muted">
          Front desk coverage — 6:00 AM to Midnight, 7 days a week
        </p>
      </div>

      <SchedulingTabs
        staff={staff}
        isAdmin={isAdmin}
        userName={currentUser?.name ?? null}
      />
    </div>
  );
}
