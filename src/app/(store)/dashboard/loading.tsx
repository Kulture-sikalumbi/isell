export default function DashboardLoading() {
  return (
    <section className="pt-28 pb-20 px-6 max-w-4xl mx-auto space-y-6">
      <div className="skeleton h-14 w-48" />
      <div className="skeleton h-10 w-full max-w-md" />
      <div className="skeleton h-40 w-full rounded-2xl" />
      <div className="skeleton h-32 w-full rounded-2xl" />
    </section>
  );
}
