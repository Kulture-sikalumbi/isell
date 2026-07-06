import Link from "next/link";
import { CategoryToolsCatalog } from "@/components/tools/category-tools-catalog";
import { getCurrentProfile } from "@/lib/auth";
import { getActiveCategoriesWithTools } from "@/lib/data";

export const metadata = {
  title: "Tools — iSell Unlocks",
};

export default async function ToolsPage() {
  const categories = (await getActiveCategoriesWithTools()).filter(
    (category) => category.tools.length > 0
  );
  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "admin";

  return (
    <section className="pt-24 sm:pt-28 pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 sm:mb-3">All Tools</h1>
          <p className="text-zinc-400 max-w-lg text-sm sm:text-base">
            Pick a tool, then choose your device. Download free — pay only to activate.
          </p>
        </div>

        <CategoryToolsCatalog categories={categories} isAdmin={isAdmin} />
      </div>
    </section>
  );
}
