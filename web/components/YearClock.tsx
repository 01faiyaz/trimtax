// The tax-year clock: one tick per day. Light ticks are behind you,
// the blue one is today, dark ticks are what's left before Dec 31.

type Props = { daysInYear: number; daysGone: number; daysLeft: number; year: number };

export default function YearClock({ daysInYear, daysGone, daysLeft, year }: Props) {
  const size = 300;
  const center = size / 2;
  const outer = 140;
  const inner = 120;

  const ticks = [];
  for (let day = 0; day < daysInYear; day++) {
    const angle = (day / daysInYear) * 2 * Math.PI - Math.PI / 2;
    const isToday = day === daysGone;
    const start = isToday ? inner - 10 : inner;
    let color = "var(--ink)";
    if (day < daysGone) color = "var(--tick-past)";
    if (isToday) color = "var(--pencil)";
    ticks.push(
      <line
        key={day}
        x1={center + Math.cos(angle) * start}
        y1={center + Math.sin(angle) * start}
        x2={center + Math.cos(angle) * outer}
        y2={center + Math.sin(angle) * outer}
        stroke={color}
        strokeWidth={isToday ? 3 : 1.2}
      />,
    );
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      style={{ maxWidth: size }}
      role="img"
      aria-label={`${daysLeft} days left in the ${year} tax year`}
    >
      {ticks}
      <text x={center} y={center + 8} textAnchor="middle" fontFamily="var(--mono)" fontWeight="700" fontSize="76">
        {daysLeft}
      </text>
      <text x={center} y={center + 40} textAnchor="middle" fontSize="14" fill="var(--ink-muted)">
        days left in {year}
      </text>
    </svg>
  );
}
