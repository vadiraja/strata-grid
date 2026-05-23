import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Table } from '@tanstack/react-table';
import type { GridTheme } from '../model/types';
import type { UseSelectionReturn } from '../model/use-selection';
import { useGridKeyboard } from '../model/use-grid-keyboard';
import { useEditContext } from '../model/edit-context';
import { HeaderArea } from './HeaderArea';
import { BodyViewport } from './BodyViewport';
import { GridFooter } from './GridFooter';
import { useColumnVirtualizer } from '../virtual/use-column-virtualizer';
import {
  getInitialVirtualItems,
  getVirtualPadding,
  sumColumnWidths,
  type ColumnLayout,
} from './column-layout';

export interface GridRootProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
  /** Height of the scrollable body area in pixels. */
  height: number;
  /**
   * Id of the tree column. Set only in tree mode; switches the grid to the
   * `treegrid` ARIA role and tells rows which cell renders the hierarchy.
   */
  treeColumnId?: string;
  /** Selection state and actions. Present only when selection is enabled. */
  selection?: UseSelectionReturn;
  /** Visual theme. */
  theme?: GridTheme;
}

/** The grid layout shell. */
export function GridRoot<TRow>({
  table,
  height,
  treeColumnId,
  selection,
  theme,
}: GridRootProps<TRow>) {
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const horizontalScrollRef = useRef<HTMLDivElement>(null);
  const scrollbarTrackRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollbarMetrics, setScrollbarMetrics] = useState({
    clientWidth: 0,
    scrollWidth: 0,
  });
  const editCtx = useEditContext();

  const leftColumns = table.getLeftVisibleLeafColumns();
  const centerColumns = table.getCenterVisibleLeafColumns();
  const rightColumns = table.getRightVisibleLeafColumns();
  const rows = table.getRowModel().rows;
  const centerWidths = centerColumns.map((column) => column.getSize());
  const keyboardColumnIds = useMemo(
    () => [
      ...(selection ? ['__selection__'] : []),
      ...table.getVisibleLeafColumns().map((column) => column.id),
    ],
    [selection, table],
  );
  const treeColumnIndex =
    treeColumnId === undefined ? -1 : keyboardColumnIds.indexOf(treeColumnId);
  const selectionColumnIndex = selection ? 0 : -1;

  const startEditAt = useCallback(
    (rowIndex: number, colIndex: number) => {
      if (!editCtx || editCtx.config.activateOn !== 'enter') return;

      const row = rows[rowIndex];
      const columnId = keyboardColumnIds[colIndex];
      if (!row || !columnId || columnId === '__selection__' || row.getIsGrouped()) {
        return;
      }

      const cell = row
        .getVisibleCells()
        .find((visibleCell) => visibleCell.column.id === columnId);
      const columnDef = cell?.column.columnDef.meta?.strataColumn;
      if (!cell || !columnDef?.editable) return;

      const editable =
        typeof columnDef.editable === 'function'
          ? columnDef.editable(row.original)
          : columnDef.editable;
      if (!editable) return;

      editCtx.editState.startEdit(row.id, columnId, cell.getValue());
    },
    [editCtx, keyboardColumnIds, rows],
  );

  const keyboard = useGridKeyboard({
    rowCount: rows.length,
    colCount: keyboardColumnIds.length,
    isTreeColumn: (colIndex) => colIndex === treeColumnIndex,
    isSelectionColumn: (colIndex) => colIndex === selectionColumnIndex,
    onExpandToggle: (rowIndex) => {
      const row = rows[rowIndex];
      if (row?.getCanExpand()) {
        row.toggleExpanded();
      }
    },
    onSelectionToggle: (rowIndex) => {
      const row = rows[rowIndex];
      if (row && selection) {
        selection.toggleRow(row.id);
      }
    },
    onCellActivate: startEditAt,
  });

  const columnVirtualizer = useColumnVirtualizer({
    scrollRef: horizontalScrollRef,
    columnWidths: centerWidths,
  });
  const showRowEditControls = editCtx?.config.mode === 'row';

  const columnLayout = useMemo<ColumnLayout<TRow>>(() => {
    const leftWidth = sumColumnWidths(leftColumns);
    const centerWidth = sumColumnWidths(centerColumns);
    const rightWidth = sumColumnWidths(rightColumns);
    const measuredVirtualItems = columnVirtualizer.getVirtualItems();
    const centerVirtualItems =
      measuredVirtualItems.length > 0
        ? measuredVirtualItems
        : getInitialVirtualItems(centerWidths);
    const padding = getVirtualPadding(centerVirtualItems, centerWidth);

    return {
      leftColumns,
      centerColumns,
      rightColumns,
      leftWidth,
      centerWidth,
      rightWidth,
      totalWidth: leftWidth + centerWidth + rightWidth,
      centerVirtualItems,
      centerBeforeWidth: padding.before,
      centerAfterWidth: padding.after,
    };
  }, [
    leftColumns,
    centerColumns,
    rightColumns,
    centerWidths,
    columnVirtualizer,
    scrollLeft,
  ]);

  const updateScrollbarMetrics = useCallback(() => {
    const scroller = horizontalScrollRef.current;
    if (!scroller) return;

    const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const clampedScrollLeft =
      scroller.clientWidth > 0
        ? Math.min(Math.max(scroller.scrollLeft, 0), max)
        : scroller.scrollLeft;

    if (scroller.scrollLeft !== clampedScrollLeft) {
      scroller.scrollLeft = clampedScrollLeft;
    }

    setScrollbarMetrics({
      clientWidth: scroller.clientWidth,
      scrollWidth: scroller.scrollWidth,
    });
    setScrollLeft(clampedScrollLeft);
  }, []);

  useLayoutEffect(() => {
    updateScrollbarMetrics();

    const scroller = horizontalScrollRef.current;
    if (!scroller || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(updateScrollbarMetrics);
    observer.observe(scroller);

    return () => {
      observer.disconnect();
    };
  }, [columnLayout.centerWidth, updateScrollbarMetrics]);

  const maxScrollLeft = Math.max(
    0,
    scrollbarMetrics.scrollWidth - scrollbarMetrics.clientWidth,
  );
  const effectiveScrollLeft =
    scrollbarMetrics.clientWidth > 0
      ? Math.min(Math.max(scrollLeft, 0), maxScrollLeft)
      : scrollLeft;
  const thumbWidth =
    scrollbarMetrics.clientWidth > 0 && scrollbarMetrics.scrollWidth > 0
      ? Math.max(
          28,
          (scrollbarMetrics.clientWidth / scrollbarMetrics.scrollWidth) *
            scrollbarMetrics.clientWidth,
        )
      : 0;
  const thumbLeft =
    maxScrollLeft > 0
      ? (effectiveScrollLeft / maxScrollLeft) *
        Math.max(0, scrollbarMetrics.clientWidth - thumbWidth)
      : 0;

  useLayoutEffect(() => {
    if (scrollbarMetrics.clientWidth === 0 || scrollLeft === effectiveScrollLeft) {
      return;
    }

    const scroller = horizontalScrollRef.current;
    if (scroller) {
      scroller.scrollLeft = effectiveScrollLeft;
    }
    setScrollLeft(effectiveScrollLeft);
  }, [effectiveScrollLeft, scrollLeft, scrollbarMetrics.clientWidth]);

  const scrollCenterTo = useCallback((nextScrollLeft: number) => {
    const scroller = horizontalScrollRef.current;
    if (!scroller) return;

    const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const clamped = Math.min(Math.max(nextScrollLeft, 0), max);
    scroller.scrollLeft = clamped;
    setScrollLeft(clamped);
  }, []);

  const handleTrackPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const track = scrollbarTrackRef.current;
      if (!track) return;

      const rect = track.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const trackRange = Math.max(1, rect.width - thumbWidth);
      const ratio = (x - thumbWidth / 2) / trackRange;
      scrollCenterTo(ratio * maxScrollLeft);
    },
    [maxScrollLeft, scrollCenterTo, thumbWidth],
  );

  const handleThumbPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const track = scrollbarTrackRef.current;
      if (!track) return;

      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startScrollLeft = scrollLeft;
      const trackRange = Math.max(1, track.clientWidth - thumbWidth);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - startX;
        scrollCenterTo(startScrollLeft + (delta / trackRange) * maxScrollLeft);
      };

      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [maxScrollLeft, scrollCenterTo, scrollLeft, thumbWidth],
  );

  return (
    <div
      className="strata-grid"
      role={treeColumnId === undefined ? 'grid' : 'treegrid'}
      data-theme={theme ?? 'light'}
      tabIndex={0}
      onKeyDown={keyboard.handleKeyDown}
      aria-activedescendant={
        rows.length > 0 && keyboardColumnIds.length > 0
          ? `strata-cell-${keyboard.activeCell[0]}-${keyboard.activeCell[1]}`
          : undefined
      }
    >
      <HeaderArea
        table={table}
        columnLayout={columnLayout}
        scrollLeft={effectiveScrollLeft}
        selection={selection}
        showRowEditControls={showRowEditControls}
      />
      <BodyViewport
        table={table}
        height={height}
        treeColumnId={treeColumnId}
        scrollRef={bodyScrollRef}
        columnLayout={columnLayout}
        scrollLeft={effectiveScrollLeft}
        selection={selection}
        activeCell={keyboard.activeCell}
        keyboardColumnIds={keyboardColumnIds}
      />
      <div className="strata-horizontal-scrollbar-row" aria-hidden="true">
        {selection && <div className="strata-horizontal-scrollbar-spacer strata-selection-scrollbar-spacer" />}
        {columnLayout.leftWidth > 0 && (
          <div
            className="strata-horizontal-scrollbar-spacer"
            style={{ width: columnLayout.leftWidth, flexShrink: 0 }}
          />
        )}
        <div className="strata-horizontal-scrollbar">
          <div
            ref={horizontalScrollRef}
            className="strata-horizontal-native-scrollbar"
            onScroll={(event) => {
              setScrollLeft(event.currentTarget.scrollLeft);
              updateScrollbarMetrics();
            }}
          >
            <div
              className="strata-horizontal-scrollbar-sizer"
              style={{ width: columnLayout.centerWidth }}
            />
          </div>
          <div
            ref={scrollbarTrackRef}
            className="strata-horizontal-scrollbar-track"
            onPointerDown={handleTrackPointerDown}
          >
            <div
              className="strata-horizontal-scrollbar-thumb"
              onPointerDown={handleThumbPointerDown}
              style={{
                width: thumbWidth,
                transform: `translateX(${thumbLeft}px)`,
                opacity: maxScrollLeft > 0 ? 1 : 0,
              }}
            />
          </div>
        </div>
        {showRowEditControls && (
          <div className="strata-horizontal-scrollbar-spacer strata-row-edit-scrollbar-spacer" />
        )}
        {columnLayout.rightWidth > 0 && (
          <div
            className="strata-horizontal-scrollbar-spacer"
            style={{ width: columnLayout.rightWidth, flexShrink: 0 }}
          />
        )}
      </div>
      <GridFooter rowCount={rows.length} />
    </div>
  );
}
