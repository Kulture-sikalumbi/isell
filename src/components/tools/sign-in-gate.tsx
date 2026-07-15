import Link from "next/link";
import { LogIn } from "lucide-react";
import { AppleIcon } from "@/components/brand/apple-icon";
import { Button } from "@/components/ui/button";
import type { Tool } from "@/types/database";

interface SignInGateProps {
  tool: Tool;
  mode: "download" | "activate" | "order";
}

export function SignInGate({ tool, mode }: SignInGateProps) {
  const next = `/tools/${tool.slug}`;
  const loginUrl = `/auth/login?next=${encodeURIComponent(next)}`;
  const isDownload = mode === "download";

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 mb-4">
        <AppleIcon className="h-5 w-5 text-cyan-400" />
      </div>
      <h3 className="font-semibold text-white mb-2">
        {isDownload ? "Sign in to download" : "Sign in to order"}
      </h3>
      <p className="text-sm text-zinc-400 mb-5 max-w-xs mx-auto">
        {isDownload
          ? "Create an account with Google to download this tool."
          : "Sign in with Google to purchase and receive order updates."}
      </p>
      <Link href={loginUrl}>
        <Button size="lg" className="w-full sm:w-auto">
          <LogIn className="h-4 w-4" />
          Continue with Google
        </Button>
      </Link>
    </div>
  );
}
