import type { ValidationState } from '../../model/types';

export interface ValidationMessageProps {
  validation: ValidationState;
}

export function ValidationMessage({ validation }: ValidationMessageProps) {
  if (validation.status === 'valid') return null;

  return (
    <div
      className={[
        'strata-validation-message',
        validation.status === 'validating' && 'strata-validation-message-validating',
      ]
        .filter(Boolean)
        .join(' ')}
      role={validation.status === 'invalid' ? 'alert' : 'status'}
    >
      {validation.status === 'validating'
        ? 'Validating...'
        : validation.message ?? 'Invalid value'}
    </div>
  );
}
