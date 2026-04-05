interface AuditScoreProps {
  score: number | null;
}

function getGrade(score: number): { letter: string; className: string } {
  if (score >= 90) return { letter: 'A', className: 'text-[var(--success)]' };
  if (score >= 80) return { letter: 'B', className: 'text-[var(--success)]' };
  if (score >= 70) return { letter: 'C', className: 'text-[var(--warning)]' };
  if (score >= 60) return { letter: 'D', className: 'text-[var(--warning)]' };
  return { letter: 'F', className: 'text-[var(--error)]' };
}

export default function AuditScore({ score }: AuditScoreProps) {
  if (score === null || score === undefined) {
    return <span className="font-mono text-sm text-foreground-subtle">—</span>;
  }
  const { letter, className } = getGrade(score);
  return (
    <span className="font-mono text-xs">
      <span className={`font-bold ${className}`}>{letter}</span>
      <span className="text-foreground-muted ml-1">{score}</span>
    </span>
  );
}
