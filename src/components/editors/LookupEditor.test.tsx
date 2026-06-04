import { render, fireEvent, act, waitFor } from '@testing-library/react';
import { LookupEditor } from './LookupEditor';
import type { LookupConfig } from '../../model/types';

interface Part { id: string; label: string; uom: string; }
const results: Part[] = [{ id: 'p1', label: 'Bolt', uom: 'EA' }];
function makeConfig(over: Partial<LookupConfig<unknown, Part>> = {}): LookupConfig<unknown, Part> {
  return { search: vi.fn(async () => results), minChars: 1, debounceMs: 200, ...over };
}

describe('LookupEditor', () => {
  it('debounces search, lists results, and emits getValue + raw result on select', async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const onSelectResult = vi.fn();
    const config = makeConfig();
    render(
      <LookupEditor value={null} config={config} row={{}} columnId="part"
        onChange={onChange} onCommit={() => {}} onDiscard={() => {}}
        onSelectResult={onSelectResult} autoFocus />,
    );
    const input = document.querySelector('.strata-lookup-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'bo' } });
    expect(config.search).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(200); });
    expect(config.search).toHaveBeenCalledWith('bo', { row: {}, columnId: 'part' });
    vi.useRealTimers();
    await waitFor(() => expect(document.querySelector('.strata-lookup-option')).not.toBeNull());
    fireEvent.click(document.querySelector('.strata-lookup-option')!);
    expect(onChange).toHaveBeenCalledWith({ id: 'p1', label: 'Bolt' });
    expect(onSelectResult).toHaveBeenCalledWith(results[0]);
  });

  it('does not search below minChars', async () => {
    vi.useFakeTimers();
    const config = makeConfig({ minChars: 3 });
    render(
      <LookupEditor value={null} config={config} row={{}} columnId="part"
        onChange={() => {}} onCommit={() => {}} onDiscard={() => {}} onSelectResult={() => {}} />,
    );
    const input = document.querySelector('.strata-lookup-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'bo' } });
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(config.search).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
