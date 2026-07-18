export function Ticker({ items }: { items: string[] }) {
  const doubled = [...items, ...items];
  return (
    // Cabinet marquee: a bordered strip running an attract loop. Flat borders,
    // one accent color, no glow soup.
    <div className="relative overflow-hidden border-y-2 border-grid bg-screen py-2">
      <div className="animate-marquee flex w-max gap-8 whitespace-nowrap px-4">
        {doubled.map((item, i) => (
          <span
            key={i}
            className="font-term text-[18px] uppercase tracking-[0.18em] text-ash"
          >
            <span className="text-phosphor">{'>'}</span> {item}
          </span>
        ))}
      </div>
    </div>
  );
}
