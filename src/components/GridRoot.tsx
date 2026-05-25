import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Table } from '@tanstack/react-table';
import type { AggregationConfig, ColumnDef, Density, GridTheme } from '../model/types';
import type { UseSelectionReturn } from '../model/use-selection';
import { useGridKeyboard } from '../model/use-grid-keyboard';
import { useCellRange } from '../model/use-cell-range';
import { useEditContext } from '../model/edit-context';
import { useAggregation } from '../model/use-aggregation';
import type { UseBomRollupReturn } from '../model/use-bom-rollup';
import type { UseDragDropReturn, UseTreeEditorReturn } from '../tree-editor';
import type { UseLazyTreeReturn } from '../data/use-lazy-tree';
import { HeaderArea } from './HeaderArea';
import { BodyViewport } from './BodyViewport';
import { GridFooter } from './GridFooter';
import { useColumnVirtualizer } from '../virtual/use-column-virtualizer';
import { useFlexColumnSizing } from '../model/use-flex-column-sizing';
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
  /** Visual density. Default: 'standard'. */
  density?: Density;
  /** Alternating row background. Default: false. */
  striped?: boolean;
  /** Smooth CSS transitions on theme/density changes. Default: false. */
  transitions?: boolean;
  /** Public leaf columns. */
  columns: ColumnDef<TRow>[];
  /** Aggregate rendering configuration. */
  aggregation?: AggregationConfig;
  /** Computed BOM extended quantities. */
  bomRollup?: UseBomRollupReturn;
  /** Tree editing API, present when hierarchy editing is enabled. */
  treeEditor?: UseTreeEditorReturn<TRow>;
  /** Drag/drop controller for tree reparenting. */
  dragDrop?: UseDragDropReturn;
  /** Whether keyboard indent/outdent/reorder/delete shortcuts are enabled. */
  enableTreeKeyboard?: boolean;
  /** Lazy tree loading state. Present when the data source supports lazy children. */
  lazyTree?: UseLazyTreeReturn<TRow>;
}

/** The grid layout shell. */
export function GridRoot<TRow>({
  table,
  height,
  treeColumnId,
  selection,
  theme,
  density,
  striped,
  transitions,
  columns,
  aggregation: aggregationConfig,
  bomRollup,
  treeEditor,
  dragDrop,
  enableTreeKeyboard,
  lazyTree,
}: GridRootProps<TRow>) {
  const gridRootRef = useRef<HTMLDivElement>(null);
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
        // Trigger lazy loading if the node is being expanded and not yet loaded
        if (!row.getIsExpanded() && lazyTree) {
          lazyTree.loadNodeChildren(row.id);
        }
      }
    },
    onSelectionToggle: (rowIndex) => {
      const row = rows[rowIndex];
      if (row && selection) {
        selection.toggleRow(row.id);
      }
    },
    onCellActivate: startEditAt,
    onIndent:
      enableTreeKeyboard && treeEditor
        ? (rowIndex) => {
            const row = rows[rowIndex];
            if (row) treeEditor.indentNode(row.id);
          }
        : undefined,
    onOutdent:
      enableTreeKeyboard && treeEditor
        ? (rowIndex) => {
            const row = rows[rowIndex];
            if (row) treeEditor.outdentNode(row.id);
          }
        : undefined,
    onReorderUp:
      enableTreeKeyboard && treeEditor
        ? (rowIndex) => {
            const row = rows[rowIndex];
            if (row) treeEditor.moveUp(row.id);
          }
        : undefined,
    onReorderDown:
      enableTreeKeyboard && treeEditor
        ? (rowIndex) => {
            const row = rows[rowIndex];
            if (row) treeEditor.moveDown(row.id);
          }
        : undefined,
    onDelete:
      enableTreeKeyboard && treeEditor
        ? (rowIndex) => {
            const selected = selection ? [...selection.selectedIds] : [];
            if (selected.length > 0) {
              treeEditor.deleteNodes(selected);
              return;
            }
            const row = rows[rowIndex];
            if (row) treeEditor.deleteNode(row.id);
          }
        : undefined,
  });

  const rangeColumnIds = useMemo(
    () =>
      table
        .getVisibleLeafColumns()
        .map((column) => column.id)
        .filter((id) => id !== treeColumnId && id !== '__selection__'),
    [table, treeColumnId],
  );
  const valuesAt = useCallback(
    (rowIndex: number, columnId: string): unknown => {
      const row = rows[rowIndex];
      if (!row) return null;
      const c = row.getVisibleCells().find((cell) => cell.column.id === columnId);
      return c?.getValue();
    },
    [rows],
  );
  const cellRange = useCellRange({ visibleColumnIds: rangeColumnIds, valuesAt });
  const [isDraggingRange, setIsDraggingRange] = useState(false);

  const handleCellPointerDown = useCallback(
    (rowId: string, columnId: string, event: React.PointerEvent) => {
      // event.button is 0 for left-click in browsers; undefined in some jsdom paths.
      if (event.button !== undefined && event.button !== 0) return;
      if (!rangeColumnIds.includes(columnId)) return;
      const rowIndex = rows.findIndex((r) => r.id === rowId);
      if (rowIndex === -1) return;
      cellRange.beginRange({ rowIndex, columnId });
      setIsDraggingRange(true);
      (event.target as Element).setPointerCapture?.(event.pointerId);
    },
    [cellRange, rangeColumnIds, rows],
  );
  const handleCellPointerEnter = useCallback(
    (rowId: string, columnId: string) => {
      if (!isDraggingRange) return;
      if (!rangeColumnIds.includes(columnId)) return;
      const rowIndex = rows.findIndex((r) => r.id === rowId);
      if (rowIndex === -1) return;
      cellRange.extendTo({ rowIndex, columnId });
    },
    [cellRange, isDraggingRange, rangeColumnIds, rows],
  );

  useEffect(() => {
    if (!isDraggingRange) return undefined;
    const handleUp = () => setIsDraggingRange(false);
    window.addEventListener('pointerup', handleUp);
    return () => window.removeEventListener('pointerup', handleUp);
  }, [isDraggingRange]);

  useFlexColumnSizing({
    table,
    columns,
    containerRef: gridRootRef,
    columnSizing: table.getState().columnSizing,
  });

  const columnVirtualizer = useColumnVirtualizer({
    scrollRef: horizontalScrollRef,
    columnWidths: centerWidths,
  });
  const showRowEditControls = editCtx?.config.mode === 'row';
  const aggregation = useAggregation({
    table,
    columns,
    showFooterAggregates: aggregationConfig?.showFooterAggregates,
  });

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

  // Resolve theme: known literals → data-theme attribute; arbitrary strings → className
  const knownThemes = ['light', 'dark', 'high-contrast-light', 'high-contrast-dark'] as const;
  const resolvedTheme = theme ?? 'light';
  const isKnownTheme = knownThemes.includes(resolvedTheme as (typeof knownThemes)[number]) || resolvedTheme === 'auto';
  const dataTheme = isKnownTheme
    ? (resolvedTheme === 'auto' ? 'light' : resolvedTheme)
    : undefined;
  const themeClassName = isKnownTheme ? undefined : resolvedTheme;

  const rootClassName = ['strata-grid', themeClassName].filter(Boolean).join(' ');

  return (
    <div
      ref={gridRootRef}
      className={rootClassName}
      role={treeColumnId === undefined ? 'grid' : 'treegrid'}
      data-theme={dataTheme}
      data-strata-density={density ?? 'standard'}
      data-strata-striped={String(striped ?? false)}
      data-strata-transitions={String(transitions ?? false)}
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
        onActiveCellChange={keyboard.setActiveCell}
        aggregation={aggregation}
        bomRollup={bomRollup}
        dragDrop={dragDrop}
        lazyTree={lazyTree}
        isInRange={(rowId, columnId) => {
          const idx = rows.findIndex((r) => r.id === rowId);
          return idx === -1 ? false : cellRange.isInRange(idx, columnId);
        }}
        isRangeFocus={(rowId, columnId) => {
          const f = cellRange.focus;
          if (!f) return false;
          return rows[f.rowIndex]?.id === rowId && f.columnId === columnId;
        }}
        onCellPointerDown={handleCellPointerDown}
        onCellPointerEnter={handleCellPointerEnter}
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
      <GridFooter
        rowCount={rows.length}
        aggregateColumns={
          aggregationConfig?.showFooterAggregates
            ? aggregation.aggregateColumns
            : undefined
        }
        aggregates={
          aggregationConfig?.showFooterAggregates
            ? aggregation.footerAggregates
            : undefined
        }
      />
    </div>
  );
}
