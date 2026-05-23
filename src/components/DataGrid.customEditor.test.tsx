import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataGrid } from './DataGrid';
import type { ColumnDef, EditorContext } from '../model/types';

interface Person {
  id: string;
  name: string;
}

const people: Person[] = [{ id: '1', name: 'Alice' }];

describe('DataGrid — custom editors', () => {
  it('passes the full editor context to custom editors', () => {
    const contextSpy = vi.fn();
    const columns: ColumnDef<Person>[] = [
      {
        id: 'name',
        header: 'Name',
        accessor: 'name',
        editable: true,
        validate: (value) => (String(value).length > 0 ? true : 'Required'),
        editor: (ctx: EditorContext<Person>) => {
          contextSpy(ctx);
          return (
            <button type="button" onClick={() => ctx.onCommit()}>
              Commit {String(ctx.value)} {ctx.validation.status}
            </button>
          );
        },
      },
    ];

    const { container } = render(
      <DataGrid data={people} columns={columns} editable={{ mode: 'cell' }} />,
    );

    fireEvent.doubleClick(container.querySelector('.strata-cell')!);

    expect(screen.getByRole('button')).toHaveTextContent('Commit Alice valid');
    expect(contextSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        value: 'Alice',
        row: people[0],
        column: columns[0],
        rowId: '0',
        validation: expect.objectContaining({ status: 'valid' }),
        onChange: expect.any(Function),
        onCommit: expect.any(Function),
        onDiscard: expect.any(Function),
      }),
    );
  });

  it('lets custom editors change and commit values', () => {
    const onCellEditEnd = vi.fn();
    const columns: ColumnDef<Person>[] = [
      {
        id: 'name',
        header: 'Name',
        accessor: 'name',
        editable: true,
        editor: (ctx) => (
          <button
            type="button"
            onClick={() => {
              ctx.onChange('Alicia');
              void ctx.onCommit();
            }}
          >
            Save custom
          </button>
        ),
      },
    ];

    const { container } = render(
      <DataGrid
        data={people}
        columns={columns}
        editable={{ mode: 'cell' }}
        onCellEditEnd={onCellEditEnd}
      />,
    );

    fireEvent.doubleClick(container.querySelector('.strata-cell')!);
    fireEvent.click(screen.getByRole('button', { name: 'Save custom' }));

    expect(onCellEditEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        columnId: 'name',
        newValue: 'Alicia',
        committed: true,
      }),
    );
  });

  it('lets custom editors discard values', () => {
    const onCellEditEnd = vi.fn();
    const columns: ColumnDef<Person>[] = [
      {
        id: 'name',
        header: 'Name',
        accessor: 'name',
        editable: true,
        editor: (ctx) => (
          <button
            type="button"
            onClick={() => {
              ctx.onChange('Discarded');
              ctx.onDiscard();
            }}
          >
            Discard custom
          </button>
        ),
      },
    ];

    const { container } = render(
      <DataGrid
        data={people}
        columns={columns}
        editable={{ mode: 'cell' }}
        onCellEditEnd={onCellEditEnd}
      />,
    );

    fireEvent.doubleClick(container.querySelector('.strata-cell')!);
    fireEvent.click(screen.getByRole('button', { name: 'Discard custom' }));

    expect(onCellEditEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        columnId: 'name',
        newValue: 'Discarded',
        committed: false,
      }),
    );
  });
});
