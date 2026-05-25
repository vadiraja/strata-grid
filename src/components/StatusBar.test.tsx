import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBar } from './StatusBar';

describe('StatusBar', () => {
  it('renders provided segments in order', () => {
    render(
      <StatusBar
        segments={[
          { id: 'count', label: 'Rows: 100' },
          { id: 'selected', label: 'Selected: 3' },
        ]}
      />,
    );
    const segments = screen.getAllByRole('status');
    expect(segments[0]).toHaveTextContent('Rows: 100');
    expect(segments[1]).toHaveTextContent('Selected: 3');
  });

  it('omits segments with hidden=true', () => {
    render(
      <StatusBar
        segments={[
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B', hidden: true },
        ]}
      />,
    );
    expect(screen.queryByText('B')).toBeNull();
  });

  it('applies the end-align modifier class to align:"end" segments', () => {
    render(
      <StatusBar
        segments={[
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B', align: 'end' },
        ]}
      />,
    );
    const segmentB = screen.getByText('B');
    expect(segmentB.className).toContain('strata-status-bar-segment-end');
  });
});
