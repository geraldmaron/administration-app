'use client';

interface RawTokenTextProps {
  text: string;
  className?: string;
}

export default function RawTokenText({ text, className }: RawTokenTextProps) {
  const TOKEN_RE = /\{([a-zA-Z_]+)\}/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span
        key={match.index}
        title={`Unresolved token: ${match[0]}`}
        className="rounded-[4px] border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-1 font-mono text-[0.75em] text-[var(--warning)]"
      >
        {match[0]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}
