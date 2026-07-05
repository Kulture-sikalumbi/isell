import { ToolsCatalog } from "@/components/tools/tools-catalog";
import { getCurrentProfile } from "@/lib/auth";
import { getTools } from "@/lib/data";

export const metadata = {
  title: "Tools — iSell Unlocks",
};

export default async function ToolsPage() {
  const tools = await getTools();
  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "admin";

  return (
    <section className="pt-24 sm:pt-28 pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 sm:mb-3">All Tools</h1>
          <p className="text-zinc-400 max-w-lg text-sm sm:text-base">
            Download any tool for free. Purchase activation when you need full access.
          </p>
        </div>

        <ToolsCatalog tools={tools} isAdmin={isAdmin} />
      </div>
    </section>
  );
}
