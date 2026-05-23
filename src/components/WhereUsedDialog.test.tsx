import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WhereUsedDialog } from './WhereUsedDialog';
import type { WhereUsedResult } from '../data/types';

interface Row { id: string; name: string }

const results: WhereUsedResult<Row>[] = [
  {
    parentNode: { id: 'A', name: 'Assembly A' },
    path: [{ id: 'A', name: 'Assembly A' }],
    quantity: 3,
  },
];

describe('WhereUsedDialog', () => {
  it('renders the node label in the title', () => {
    render(
      <WhereUsedDialog
        nodeLabel="Bolt M6"
        results={results}
        isLoading={false}
        renderNodeLabel={(n) => n.name}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/Where used: Bolt M6/)).toBeInTheDocument();
  });

  it('renders results with path', () => {
    render(
      <WhereUsedDialog
        nodeLabel="Bolt M6"
        results={results}
        isLoading={false}
        renderNodeLabel={(n) => n.name}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Assembly A')).toBeInTheDocument();
    expect(screen.getByText('Qty: 3')).toBeInTheDocument();
  });

  it('shows empty state when no results', () => {
    render(
      <WhereUsedDialog<Row>
        nodeLabel="Bolt M6"
        results={[]}
        isLoading={false}
        renderNodeLabel={(n) => n.name}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/No parent assemblies found/)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <WhereUsedDialog<Row>
        nodeLabel="Bolt M6"
        results={[]}
        isLoading={true}
        renderNodeLabel={(n) => n.name}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <WhereUsedDialog
        nodeLabel="Bolt M6"
        results={results}
        isLoading={false}
        renderNodeLabel={(n) => n.name}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onNavigate when a result is clicked', () => {
    const onNavigate = vi.fn();
    render(
      <WhereUsedDialog
        nodeLabel="Bolt M6"
        results={results}
        isLoading={false}
        renderNodeLabel={(n) => n.name}
        onClose={vi.fn()}
        onNavigate={onNavigate}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Assembly A/i }));
    expect(onNavigate).toHaveBeenCalledWith(results[0]);
  });
});
