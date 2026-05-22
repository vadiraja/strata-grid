# Strata M2 · Plan 2 — Built-in Editors · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the five built-in editor components (text, number, select, date, checkbox) and the `CellEditor` overlay that renders the active editor inline over the cell being edited. Each editor auto-focuses on mount, commits on Enter/blur, and discards on Escape.

**Architecture:** A `CellEditor` component reads the active cell from `EditContext`, resolves the correct editor component (custom → editorType → auto-detect), and renders it positioned over the cell. Each built-in editor is a controlled `<input>` (or `<select>`) that calls `editState.setPendingValue` on change and `commitEdit`/`discardEdit` on Enter/Escape.

**Tech Stack:** TypeScript, React 18/19, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-22-strata-m2-editing-aggregation-design.md` (§3.3, §4). Builds on Plan 1 (edit state).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/components/editors/CellEditor.tsx` | create | Editor overlay — resolves and renders the active editor |
| `src/components/editors/TextEditor.tsx` | create | Built-in text input editor |
| `src/components/editors/NumberEditor.tsx` | create | Built-in number input editor |
| `src/components/editors/SelectEditor.tsx` | create | Built-in select dropdown editor |
| `src/components/editors/DateEditor.tsx` | create | Built-in date input editor |
| `src/components/editors/CheckboxEditor.tsx` | create | Built-in checkbox editor |
| `src/components/editors/index.ts` | create | Barrel export |
| `src/components/editors/editors.test.tsx` | create | Unit tests for all editors |
| `src/components/BodyViewport.tsx` | modify | Render CellEditor overlay |
| `src/strata.css` | modify | Editor positioning styles |

---

## Task 1: TextEditor component

The simplest editor — a text `<input>` that auto-focuses, commits on Enter/blur, discards on Escape.

**Files:**
- Create: `src/components/editors/TextEditor.tsx`

- [ ] **Step 1: Create `src/components/editors/TextEditor.tsx`**

```tsx
import { useRef, useEffect } from 'react';

export interface TextEditorProps {
  value: unknown;
  onChange: (value: string) => void;
  onCommit: () => void;
  onDiscard: () => void;
}

/**
 * Built-in text editor. Renders a plain <input type="text">.
 * Auto-focuses and selects all text on mount.
 */
export function TextEditor({ value, onChange, onCommit, onDiscard }: TextEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onDiscard();
    }
  };

  return (
    <input
      ref={inputRef}
      className="strata-editor strata-editor-text"
      type="text"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={onCommit}
    />
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/editors/TextEditor.tsx
git commit -m "feat(m2): add TextEditor component"
```

---

## Task 2: NumberEditor component

A number `<input>` that parses to a numeric value. Commits on Enter/blur, discards on Escape.

**Files:**
- Create: `src/components/editors/NumberEditor.tsx`

- [ ] **Step 1: Create `src/components/editors/NumberEditor.tsx`**

```tsx
import { useRef, useEffect } from 'react';

export interface NumberEditorProps {
  value: unknown;
  onChange: (value: number | null) => void;
  onCommit: () => void;
  onDiscard: () => void;
}

/**
 * Built-in number editor. Renders <input type="number">.
 * Parses input to a number; empty string → null.
 */
export function NumberEditor({ value, onChange, onCommit, onDiscard }: NumberEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onDiscard();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange(null);
    } else {
      const num = parseFloat(raw);
      onChange(isNaN(num) ? null : num);
    }
  };

  return (
    <input
      ref={inputRef}
      className="strata-editor strata-editor-number"
      type="number"
      value={value === null || value === undefined ? '' : String(value)}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={onCommit}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editors/NumberEditor.tsx
git commit -m "feat(m2): add NumberEditor component"
```

---

## Task 3: SelectEditor, DateEditor, CheckboxEditor

The remaining three built-in editors.

**Files:**
- Create: `src/components/editors/SelectEditor.tsx`
- Create: `src/components/editors/DateEditor.tsx`
- Create: `src/components/editors/CheckboxEditor.tsx`

- [ ] **Step 1: Create `src/components/editors/SelectEditor.tsx`**

```tsx
import { useRef, useEffect } from 'react';

export interface SelectEditorProps {
  value: unknown;
  choices: { value: string | number; label: string }[];
  onChange: (value: string | number) => void;
  onCommit: () => void;
  onDiscard: () => void;
}

export function SelectEditor({ value, choices, onChange, onCommit, onDiscard }: SelectEditorProps) {
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => { selectRef.current?.focus(); }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); onCommit(); }
    else if (e.key === 'Escape') { e.preventDefault(); onDiscard(); }
  };

  return (
    <select
      ref={selectRef}
      className="strata-editor strata-editor-select"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={onCommit}
    >
      {choices.map((c) => (
        <option key={c.value} value={c.value}>{c.label}</option>
      ))}
    </select>
  );
}
```

- [ ] **Step 2: Create `src/components/editors/DateEditor.tsx`**

```tsx
import { useRef, useEffect } from 'react';

export interface DateEditorProps {
  value: unknown;
  onChange: (value: string) => void;
  onCommit: () => void;
  onDiscard: () => void;
}

export function DateEditor({ value, onChange, onCommit, onDiscard }: DateEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); onCommit(); }
    else if (e.key === 'Escape') { e.preventDefault(); onDiscard(); }
  };

  return (
    <input
      ref={inputRef}
      className="strata-editor strata-editor-date"
      type="date"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={onCommit}
    />
  );
}
```

- [ ] **Step 3: Create `src/components/editors/CheckboxEditor.tsx`**

```tsx
import { useRef, useEffect } from 'react';

export interface CheckboxEditorProps {
  value: unknown;
  onChange: (value: boolean) => void;
  onCommit: () => void;
  onDiscard: () => void;
}

export function CheckboxEditor({ value, onChange, onCommit, onDiscard }: CheckboxEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onDiscard(); }
  };

  const handleChange = () => {
    onChange(!value);
    // Checkbox commits immediately on toggle
    setTimeout(onCommit, 0);
  };

  return (
    <input
      ref={inputRef}
      className="strata-editor strata-editor-checkbox"
      type="checkbox"
      checked={Boolean(value)}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
    />
  );
}
```

- [ ] **Step 4: Create barrel export `src/components/editors/index.ts`**

```ts
export { TextEditor } from './TextEditor';
export { NumberEditor } from './NumberEditor';
export { SelectEditor } from './SelectEditor';
export { DateEditor } from './DateEditor';
export { CheckboxEditor } from './CheckboxEditor';
```

- [ ] **Step 5: Verify all type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/editors/
git commit -m "feat(m2): add SelectEditor, DateEditor, CheckboxEditor"
```

---

## Task 4: CellEditor overlay

The `CellEditor` component reads the active cell from `EditContext`, resolves the correct editor, and renders it inline over the cell.

**Files:**
- Create: `src/components/editors/CellEditor.tsx`
- Modify: `src/components/BodyViewport.tsx`

- [ ] **Step 1: Create `src/components/editors/CellEditor.tsx`**

```tsx
import type { ReactNode } from 'react';
import { useEditContext } from '../../model/edit-context';
import { TextEditor } from './TextEditor';
import { NumberEditor } from './NumberEditor';
import { SelectEditor } from './SelectEditor';
import { DateEditor } from './DateEditor';
import { CheckboxEditor } from './CheckboxEditor';
import type { ColumnDef, EditorType } from '../../model/types';

/**
 * Resolves and renders the appropriate editor for the active cell.
 * Reads from EditContext — renders nothing when no cell is being edited.
 */
export function CellEditor(): ReactNode {
  const editCtx = useEditContext();
  if (!editCtx) return null;

  const { editState } = editCtx;
  const { activeCell } = editState;
  if (!activeCell) return null;

  const { pendingValue } = activeCell;
  const onChange = editState.setPendingValue;
  const onCommit = editState.commitEdit;
  const onDiscard = editState.discardEdit;

  // For now, resolve editor type from context
  // (In the full wiring, we'd look up the column def from the table)
  // This will be enhanced when wired into BodyViewport with column access
  return (
    <div className="strata-cell-editor-container">
      <TextEditor
        value={pendingValue}
        onChange={onChange}
        onCommit={onCommit}
        onDiscard={onDiscard}
      />
    </div>
  );
}
```

Note: The full editor resolution (custom → editorType → auto-detect) will be
wired in Step 2 when we have access to the column definition from the table.

- [ ] **Step 2: Create editor resolver utility**

Add to `src/components/editors/CellEditor.tsx` — a `resolveEditor` function:

```tsx
function resolveEditor(
  editorType: EditorType | undefined,
  value: unknown,
  onChange: (v: unknown) => void,
  onCommit: () => void,
  onDiscard: () => void,
  editorOptions?: Record<string, unknown>,
): ReactNode {
  switch (editorType) {
    case 'number':
      return <NumberEditor value={value} onChange={onChange as any} onCommit={onCommit} onDiscard={onDiscard} />;
    case 'select':
      return (
        <SelectEditor
          value={value}
          choices={(editorOptions?.choices as any) ?? []}
          onChange={onChange as any}
          onCommit={onCommit}
          onDiscard={onDiscard}
        />
      );
    case 'date':
      return <DateEditor value={value} onChange={onChange as any} onCommit={onCommit} onDiscard={onDiscard} />;
    case 'checkbox':
      return <CheckboxEditor value={value} onChange={onChange as any} onCommit={onCommit} onDiscard={onDiscard} />;
    case 'text':
    default:
      return <TextEditor value={value} onChange={onChange as any} onCommit={onCommit} onDiscard={onDiscard} />;
  }
}
```

- [ ] **Step 3: Add editor CSS to `src/strata.css`**

```css
/* --- Cell Editor --- */

.strata-cell-editor-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 5;
}

.strata-editor {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: var(--strata-cell-padding-y) var(--strata-cell-padding-x);
  font-family: var(--strata-font-family);
  font-size: var(--strata-font-size);
  color: var(--strata-text);
  background: var(--strata-bg);
  border: none;
  outline: none;
}

.strata-editor:focus {
  outline: none;
}

.strata-editor-select {
  appearance: auto;
}

.strata-editor-checkbox {
  width: auto;
  height: auto;
  margin: auto;
  display: block;
}
```

- [ ] **Step 4: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/editors/CellEditor.tsx src/strata.css
git commit -m "feat(m2): add CellEditor overlay with editor resolution"
```

---

## Task 5: Editor unit tests

Tests for all five built-in editors — focus, commit on Enter, discard on Escape, value changes.

**Files:**
- Create: `src/components/editors/editors.test.tsx`

- [ ] **Step 1: Create `src/components/editors/editors.test.tsx`**

```tsx
import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TextEditor } from './TextEditor';
import { NumberEditor } from './NumberEditor';
import { SelectEditor } from './SelectEditor';
import { DateEditor } from './DateEditor';
import { CheckboxEditor } from './CheckboxEditor';

describe('TextEditor', () => {
  it('renders with initial value', () => {
    render(<TextEditor value="hello" onChange={vi.fn()} onCommit={vi.fn()} onDiscard={vi.fn()} />);
    expect(screen.getByDisplayValue('hello')).toBeTruthy();
  });

  it('auto-focuses on mount', () => {
    const { container } = render(
      <TextEditor value="" onChange={vi.fn()} onCommit={vi.fn()} onDiscard={vi.fn()} />,
    );
    expect(container.querySelector('input')).toBe(document.activeElement);
  });

  it('calls onChange on input', () => {
    const onChange = vi.fn();
    render(<TextEditor value="" onChange={onChange} onCommit={vi.fn()} onDiscard={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'world' } });
    expect(onChange).toHaveBeenCalledWith('world');
  });

  it('calls onCommit on Enter', () => {
    const onCommit = vi.fn();
    render(<TextEditor value="" onChange={vi.fn()} onCommit={onCommit} onDiscard={vi.fn()} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(onCommit).toHaveBeenCalled();
  });

  it('calls onDiscard on Escape', () => {
    const onDiscard = vi.fn();
    render(<TextEditor value="" onChange={vi.fn()} onCommit={vi.fn()} onDiscard={onDiscard} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(onDiscard).toHaveBeenCalled();
  });
});

describe('NumberEditor', () => {
  it('renders with numeric value', () => {
    render(<NumberEditor value={42} onChange={vi.fn()} onCommit={vi.fn()} onDiscard={vi.fn()} />);
    expect(screen.getByDisplayValue('42')).toBeTruthy();
  });

  it('parses input to number', () => {
    const onChange = vi.fn();
    render(<NumberEditor value={0} onChange={onChange} onCommit={vi.fn()} onDiscard={vi.fn()} />);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '99' } });
    expect(onChange).toHaveBeenCalledWith(99);
  });

  it('returns null for empty input', () => {
    const onChange = vi.fn();
    render(<NumberEditor value={42} onChange={onChange} onCommit={vi.fn()} onDiscard={vi.fn()} />);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe('SelectEditor', () => {
  const choices = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
  ];

  it('renders options', () => {
    render(
      <SelectEditor value="a" choices={choices} onChange={vi.fn()} onCommit={vi.fn()} onDiscard={vi.fn()} />,
    );
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
  });

  it('calls onChange on selection', () => {
    const onChange = vi.fn();
    render(
      <SelectEditor value="a" choices={choices} onChange={onChange} onCommit={vi.fn()} onDiscard={vi.fn()} />,
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });
    expect(onChange).toHaveBeenCalledWith('b');
  });
});

describe('CheckboxEditor', () => {
  it('renders checked state', () => {
    render(<CheckboxEditor value={true} onChange={vi.fn()} onCommit={vi.fn()} onDiscard={vi.fn()} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('toggles value on click', () => {
    const onChange = vi.fn();
    render(<CheckboxEditor value={false} onChange={onChange} onCommit={vi.fn()} onDiscard={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('DateEditor', () => {
  it('renders with date value', () => {
    const { container } = render(
      <DateEditor value="2026-01-15" onChange={vi.fn()} onCommit={vi.fn()} onDiscard={vi.fn()} />,
    );
    const input = container.querySelector('input[type="date"]');
    expect(input).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe('2026-01-15');
  });

  it('calls onChange on date change', () => {
    const onChange = vi.fn();
    const { container } = render(
      <DateEditor value="" onChange={onChange} onCommit={vi.fn()} onDiscard={vi.fn()} />,
    );
    const input = container.querySelector('input[type="date"]')!;
    fireEvent.change(input, { target: { value: '2026-06-01' } });
    expect(onChange).toHaveBeenCalledWith('2026-06-01');
  });
});
```

- [ ] **Step 2: Run the editor tests**

Run: `npx vitest run src/components/editors/editors.test.tsx`
Expected: PASS — all tests pass.

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 4: Commit**

```bash
git add src/components/editors/editors.test.tsx
git commit -m "test(m2): add unit tests for all built-in editors"
```
