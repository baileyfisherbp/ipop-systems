import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AgentChat from "./components/AgentChat";

export const metadata = {
  title: "IPOP Operations Agent",
};

export default async function AgentPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <AgentChat />;
}
