export function Ticker({ items }: { items: string[] }) {
  const doubled = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-phosphor/20 bg-carbon/60 py-2">
      <div className="animate-marquee flex w-max gap-8 whitespace-nowrap">
        {doubled.map((item, i) => (
          <span
            key={i}
            className="text-[11px] uppercase tracking-[0.25em] text-ash"
          >
            <span className="text-phosphor">/</span> {item}
          </span>
        ))}
      </div>
    </div>
  );
}
