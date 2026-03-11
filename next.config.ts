import { execSync } from "child_process";
import type { NextConfig } from "next";

function git(cmd: string): string {
  try {
    return execSync(`git ${cmd}`, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_GIT_HASH: git("rev-parse --short HEAD"),
    NEXT_PUBLIC_GIT_MESSAGE: git("log -1 --pretty=%B"),
    NEXT_PUBLIC_GIT_DATE: git("log -1 --format=%cd --date=short"),
  },
};

export default nextConfig;
