// components/section.tsx
export default function Section({
  title,
  children,
  right,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {right}
      </div>
      <div className="card p-4">{children}</div>
    </section>
  );
}
