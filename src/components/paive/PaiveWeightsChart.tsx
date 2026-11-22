export function PaiveWeightsChart({
  weights,
  consistencyRatio,
}: {
  weights: Record<string, number>;
  consistencyRatio: number;
}) {
  const entries = Object.entries(weights);
  const max = Math.max(...entries.map(([, v]) => v), 0.01);
  return (
    <div className="rounded-xl border border-border bg-background/40 p-4">
      <i className="mb-3 block text-base font-semibold not-italic">Client weights (AHP)</i>
      <ul className="space-y-2">
        {entries.map(([name, value]) => (
          <li key={name} className="flex items-center gap-3 text-base">
            <span className="w-36 shrink-0 text-muted-foreground">{name}</span>
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(value / max) * 100}%` }} />
            </div>
            <span className="w-12 shrink-0 text-right font-mono text-sm">{value.toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted-foreground">Consistency ratio: {consistencyRatio.toFixed(3)}</p>
    </div>
  );
}