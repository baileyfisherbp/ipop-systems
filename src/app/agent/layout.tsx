import { Syne, DM_Sans, DM_Mono } from "next/font/google";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${syne.variable} ${dmSans.variable} ${dmMono.variable} h-screen overflow-hidden`}
      style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
    >
      {children}
    </div>
  );
}
