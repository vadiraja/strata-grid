export interface StatusBarSegment {
  id: string;
  label: string;
  hidden?: boolean;
  align?: 'start' | 'end';
}

export interface StatusBarProps {
  segments: StatusBarSegment[];
}

export function StatusBar({ segments }: StatusBarProps) {
  const visible = segments.filter((s) => !s.hidden);
  return (
    <div className="strata-status-bar">
      {visible.map((s) => (
        <span
          key={s.id}
          className={`strata-status-bar-segment${
            s.align === 'end' ? ' strata-status-bar-segment-end' : ''
          }`}
          role="status"
        >
          {s.label}
        </span>
      ))}
    </div>
  );
}
