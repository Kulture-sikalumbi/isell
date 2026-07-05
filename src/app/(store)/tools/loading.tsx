export default function ToolsLoading() {
  return (
    <section className="pt-28 pb-20 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="skeleton h-8 w-32 mb-8" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-44 rounded-2xl" />
        ))}
      </div>
    </section>
  );
}
