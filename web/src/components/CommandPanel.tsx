import type { HTMLAttributes, ReactNode } from 'react';

type PanelTone = 'default' | 'muted' | 'accent' | 'danger';

interface CommandPanelProps extends HTMLAttributes<HTMLDivElement> {
  tone?: PanelTone;
  children: ReactNode;
}

const toneClasses: Record<PanelTone, string> = {
  default: '',
  muted: 'command-panel-muted',
  accent: 'border-[rgba(25,105,220,0.35)] bg-[rgba(25,105,220,0.08)]',
  danger: 'border-[rgba(254,71,60,0.35)] bg-[rgba(254,71,60,0.05)]',
};

export default function CommandPanel({ tone = 'default', className = '', children, ...props }: CommandPanelProps) {
  return (
    <div className={`command-panel ${toneClasses[tone]} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}