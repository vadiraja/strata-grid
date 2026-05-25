import { useCallback, useState } from 'react';
import type { ContextMenuTarget } from './types';

export interface UseContextMenuReturn {
  open: boolean;
  position: { x: number; y: number };
  target: ContextMenuTarget | null;
  openAt: (target: ContextMenuTarget, position: { x: number; y: number }) => void;
  close: () => void;
}

export function useContextMenu(): UseContextMenuReturn {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [target, setTarget] = useState<ContextMenuTarget | null>(null);

  const openAt = useCallback(
    (nextTarget: ContextMenuTarget, nextPos: { x: number; y: number }) => {
      setTarget(nextTarget);
      setPosition(nextPos);
      setOpen(true);
    },
    [],
  );
  const close = useCallback(() => setOpen(false), []);

  return { open, position, target, openAt, close };
}
