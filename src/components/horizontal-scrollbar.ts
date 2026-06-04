/**
 * Whether the horizontal scrollbar row should collapse its visible chrome.
 * True when there is no horizontal overflow to scroll.
 */
export function shouldCollapseHorizontalScrollbar(maxScrollLeft: number): boolean {
  return maxScrollLeft <= 0;
}
