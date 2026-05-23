import { describe, it, expect } from 'vitest';
import { CsvWriter } from './csv-writer';
import type { ExportColumn } from './types';

const columns: ExportColumn[] = [
  { id: 'name', header: 'Name' },
  { id: 'age', header: 'Age' },
  { id: 'city', header: 'City' },
];

describe('CsvWriter', () => {
  it('generates header row', () => {
    const writer = new CsvWriter(columns, { bom: false });
    writer.addRow({ name: 'Alice', age: '30', city: 'NYC' });
    const csv = writer.toString();
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Name,Age,City');
  });

  it('generates data rows', () => {
    const writer = new CsvWriter(columns, { bom: false });
    writer.addRow({ name: 'Alice', age: '30', city: 'NYC' });
    writer.addRow({ name: 'Bob', age: '25', city: 'LA' });
    const csv = writer.toString();
    const lines = csv.split('\r\n');
    expect(lines[1]).toBe('Alice,30,NYC');
    expect(lines[2]).toBe('Bob,25,LA');
  });

  it('quotes values containing commas', () => {
    const writer = new CsvWriter(columns, { bom: false });
    writer.addRow({ name: 'Smith, John', age: '40', city: 'SF' });
    const csv = writer.toString();
    expect(csv).toContain('"Smith, John"');
  });

  it('escapes double quotes by doubling them', () => {
    const writer = new CsvWriter(columns, { bom: false });
    writer.addRow({ name: 'She said "hello"', age: '28', city: 'Boston' });
    const csv = writer.toString();
    expect(csv).toContain('"She said ""hello"""');
  });

  it('quotes values containing newlines', () => {
    const writer = new CsvWriter(columns, { bom: false });
    writer.addRow({ name: 'Line1\nLine2', age: '33', city: 'Denver' });
    const csv = writer.toString();
    expect(csv).toContain('"Line1\nLine2"');
  });

  it('handles empty values', () => {
    const writer = new CsvWriter(columns, { bom: false });
    writer.addRow({ name: 'Alice', age: '', city: '' });
    const csv = writer.toString();
    const lines = csv.split('\r\n');
    expect(lines[1]).toBe('Alice,,');
  });

  it('includes BOM when configured', () => {
    const writer = new CsvWriter(columns, { bom: true });
    writer.addRow({ name: 'Alice', age: '30', city: 'NYC' });
    const csv = writer.toString();
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('includes BOM by default', () => {
    const writer = new CsvWriter(columns);
    writer.addRow({ name: 'Alice', age: '30', city: 'NYC' });
    const csv = writer.toString();
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('toBlob returns a Blob with correct MIME type', () => {
    const writer = new CsvWriter(columns);
    writer.addRow({ name: 'Alice', age: '30', city: 'NYC' });
    const blob = writer.toBlob();
    expect(blob.type).toBe('text/csv;charset=utf-8');
  });

  it('supports custom delimiter', () => {
    const writer = new CsvWriter(columns, { bom: false, delimiter: '\t' });
    writer.addRow({ name: 'Alice', age: '30', city: 'NYC' });
    const csv = writer.toString();
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Name\tAge\tCity');
    expect(lines[1]).toBe('Alice\t30\tNYC');
  });
});
