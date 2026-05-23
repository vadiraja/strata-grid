import type { ReactNode } from 'react';
import type { WhereUsedResult } from '../data/types';
import { StrataIcon } from '../icons';

export interface WhereUsedDialogProps<TRow> {
  /** The node being queried. */
  nodeLabel: string;
  /** Query results. */
  results: WhereUsedResult<TRow>[];
  /** Whether the query is loading. */
  isLoading: boolean;
  /** Error message. */
  error?: string;
  /** How to render a node label in the path. */
  renderNodeLabel: (node: TRow) => ReactNode;
  /** Close handler. */
  onClose: () => void;
  /** Navigate to a result (e.g., scroll to row). */
  onNavigate?: (result: WhereUsedResult<TRow>) => void;
}

export function WhereUsedDialog<TRow>({
  nodeLabel,
  results,
  isLoading,
  error,
  renderNodeLabel,
  onClose,
  onNavigate,
}: WhereUsedDialogProps<TRow>) {
  return (
    <div className="strata-where-used-dialog" role="dialog" aria-label={`Where used: ${nodeLabel}`}>
      <div className="strata-where-used-header">
        <h3 className="strata-where-used-title">Where used: {nodeLabel}</h3>
        <button onClick={onClose} aria-label="Close" className="strata-where-used-close">
          <StrataIcon name="x" />
        </button>
      </div>

      <div className="strata-where-used-body">
        {isLoading && <div className="strata-where-used-loading">Searching...</div>}

        {error && <div className="strata-where-used-error">{error}</div>}

        {!isLoading && !error && results.length === 0 && (
          <div className="strata-where-used-empty">
            No parent assemblies found.
          </div>
        )}

        {results.length > 0 && (
          <ul className="strata-where-used-results">
            {results.map((result, index) => (
              <li key={index} className="strata-where-used-result">
                <button
                  className="strata-where-used-result-btn"
                  onClick={() => onNavigate?.(result)}
                >
                  <span className="strata-where-used-path">
                    {result.path.map((node, i) => (
                      <span key={i} className="strata-where-used-path-node">
                        {i > 0 && <span className="strata-where-used-separator"> › </span>}
                        {renderNodeLabel(node)}
                      </span>
                    ))}
                  </span>
                  {result.quantity != null && (
                    <span className="strata-where-used-qty">Qty: {result.quantity}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
