import { InMemoryDataSource } from './in-memory-data-source';

describe('InMemoryDataSource', () => {
  it('load() returns the rows it was constructed with', () => {
    const source = new InMemoryDataSource([{ id: 1 }, { id: 2 }]);
    expect(source.load()).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('setRows() replaces the rows', () => {
    const source = new InMemoryDataSource([{ id: 1 }]);
    source.setRows([{ id: 9 }]);
    expect(source.load()).toEqual([{ id: 9 }]);
  });

  it('setRows() notifies subscribers', () => {
    const source = new InMemoryDataSource([{ id: 1 }]);
    let calls = 0;
    source.subscribe(() => {
      calls += 1;
    });
    source.setRows([{ id: 2 }]);
    expect(calls).toBe(1);
  });

  it('the unsubscribe function stops notifications', () => {
    const source = new InMemoryDataSource([{ id: 1 }]);
    let calls = 0;
    const unsubscribe = source.subscribe(() => {
      calls += 1;
    });
    unsubscribe();
    source.setRows([{ id: 2 }]);
    expect(calls).toBe(0);
  });
});
