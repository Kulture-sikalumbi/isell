import { CategoryToolsCatalog } from "@/components/tools/category-tools-catalog";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { getActiveCategoriesWithTools } from "@/lib/data";

export const metadata = {
  title: "Tools — iSell Unlocks",
};

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: categorySlug } = await searchParams;
  const categories = await getActiveCategoriesWithTools();
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "admin";
  const isLoggedIn = Boolean(user);
  const activeCategory = categorySlug
    ? categories.find((c) => c.slug === categorySlug && c.slug !== "general")
    : null;

  return (
    <section className="pt-24 sm:pt-28 pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {!activeCategory ? (
          <div className="mb-8 sm:mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 sm:mb-3">All Tools</h1>
            <p className="text-zinc-400 max-w-lg text-sm sm:text-base">
              Choose a tool to browse devices. Each device has its own price and download link.
            </p>
          </div>
        ) : (
          <div className="mb-6" aria-hidden />
        )}

        <CategoryToolsCatalog categories={categories} isAdmin={isAdmin} isLoggedIn={isLoggedIn} />
      </div>
    </section>
  );
}
