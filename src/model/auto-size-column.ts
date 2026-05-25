const DEFAULT_PADDING = 16;
const DEFAULT_MIN = 40;

export function measureColumnWidth(
  root: HTMLElement,
  columnId: string,
  padding: number = DEFAULT_PADDING,
  minWidth: number = DEFAULT_MIN,
): number {
  const cells = root.querySelectorAll<HTMLElement>(
    `[data-strata-cell-column="${CSS.escape(columnId)}"]`,
  );
  let max = 0;
  cells.forEach((cell) => {
    const w = cell.scrollWidth;
    if (w > max) max = w;
  });
  return Math.max(minWidth, max + padding);
}
