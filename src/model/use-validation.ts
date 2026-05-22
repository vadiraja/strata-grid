import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ValidationState, Validator } from './types';

export interface ValidationOptions<TRow> {
  validate?: Validator<TRow> | Validator<TRow>[];
  value: unknown;
  row: TRow;
  debounceMs?: number;
}

export interface ValidationReturn {
  validation: ValidationState;
  validateNow: () => Promise<ValidationState>;
}

const validState: ValidationState = { status: 'valid' };

function normalizeValidators<TRow>(
  validate?: Validator<TRow> | Validator<TRow>[],
): Validator<TRow>[] {
  if (!validate) return [];
  return Array.isArray(validate) ? validate : [validate];
}

async function runValidators<TRow>(
  validators: Validator<TRow>[],
  value: unknown,
  row: TRow,
): Promise<ValidationState> {
  for (const validator of validators) {
    const result = await validator(value, row);
    if (result !== true) {
      return { status: 'invalid', message: result };
    }
  }

  return validState;
}

export function useValidation<TRow>({
  validate,
  value,
  row,
  debounceMs = 300,
}: ValidationOptions<TRow>): ValidationReturn {
  const validators = useMemo(() => normalizeValidators(validate), [validate]);
  const [validation, setValidation] = useState<ValidationState>(validState);
  const runIdRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const validateNow = useCallback(async () => {
    clearPending();

    if (validators.length === 0) {
      setValidation(validState);
      return validState;
    }

    const runId = ++runIdRef.current;
    setValidation({ status: 'validating' });
    const nextValidation = await runValidators(validators, value, row);

    if (runId === runIdRef.current) {
      setValidation(nextValidation);
    }

    return nextValidation;
  }, [clearPending, row, validators, value]);

  useEffect(() => {
    clearPending();
    const runId = ++runIdRef.current;

    if (validators.length === 0) {
      setValidation(validState);
      return;
    }

    setValidation({ status: 'validating' });
    timeoutRef.current = setTimeout(() => {
      void runValidators(validators, value, row).then((nextValidation) => {
        if (runId === runIdRef.current) {
          setValidation(nextValidation);
        }
      });
    }, debounceMs);

    return clearPending;
  }, [clearPending, debounceMs, row, validators, value]);

  return { validation, validateNow };
}
