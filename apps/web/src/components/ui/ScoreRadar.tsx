interface ScoreRadarProps {
  scores: Record<string, number>;
  size?: number;
}

export function ScoreRadar({ scores, size = 220 }: ScoreRadarProps) {
  const entries = Object.entries(scores);
  const count = entries.length;
  if (count === 0) return null;

  const center = size / 2;
  const radius = size / 2 - 32;
  const angleStep = (Math.PI * 2) / count;

  function pointAt(index: number, valueRatio: number) {
    const angle = angleStep * index - Math.PI / 2;
    const r = radius * valueRatio;
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)] as const;
  }

  const valuePoints = entries.map(([, value], index) => pointAt(index, Math.max(0, Math.min(value, 100)) / 100));

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const labelPad = 30;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-labelPad} ${-labelPad} ${size + labelPad * 2} ${size + labelPad * 2}`}
      className="mx-auto max-w-full"
    >
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={entries.map((_, index) => pointAt(index, level).join(",")).join(" ")}
          fill="none"
          stroke="var(--border)"
          strokeWidth={1}
        />
      ))}
      {entries.map((_, index) => {
        const [x, y] = pointAt(index, 1);
        return <line key={index} x1={center} y1={center} x2={x} y2={y} stroke="var(--border)" strokeWidth={1} />;
      })}
      <polygon
        points={valuePoints.map((point) => point.join(",")).join(" ")}
        fill="var(--primary)"
        fillOpacity={0.12}
        stroke="var(--primary)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {valuePoints.map(([x, y], index) => (
        <circle key={index} cx={x} cy={y} r={2.5} fill="var(--primary)" />
      ))}
      {entries.map(([label], index) => {
        const [x, y] = pointAt(index, 1.22);
        return (
          <text
            key={label}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 10, textTransform: "capitalize" }}
          >
            {label.replace(/_/g, " ")}
          </text>
        );
      })}
    </svg>
  );
}
