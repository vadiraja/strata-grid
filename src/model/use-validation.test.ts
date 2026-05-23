import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useValidation } from './use-validation';
import type { Validator } from './types';

interface Row {
  name: string;
}

const row: Row = { name: 'Alice' };

describe('useValidation', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts valid when no validator is provided', () => {
    const { result } = renderHook(() =>
      useValidation({ value: 'Alice', row }),
    );

    expect(result.current.validation).toEqual({ status: 'valid' });
  });

  it('debounces sync validators and stores invalid messages', async () => {
    vi.useFakeTimers();
    const validate: Validator<Row> = (value) =>
      String(value).length >= 3 ? true : 'Use at least 3 characters';
    const { result } = renderHook(() =>
      useValidation({ validate, value: 'Al', row }),
    );

    expect(result.current.validation).toEqual({ status: 'validating' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.validation).toEqual({
      status: 'invalid',
      message: 'Use at least 3 characters',
    });
  });

  it('runs validators immediately on validateNow', async () => {
    vi.useFakeTimers();
    const validate: Validator<Row> = (value) =>
      String(value).includes('@') ? true : 'Email is required';
    const { result } = renderHook(() =>
      useValidation({ validate, value: 'alice', row }),
    );

    let validation;
    await act(async () => {
      validation = await result.current.validateNow();
    });

    expect(validation).toEqual({
      status: 'invalid',
      message: 'Email is required',
    });
    expect(result.current.validation).toEqual({
      status: 'invalid',
      message: 'Email is required',
    });
  });

  it('ignores stale async validation results', async () => {
    vi.useFakeTimers();
    const validate = vi.fn<Validator<Row>>(async (value) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return value === 'new' ? true : 'Stale value';
    });
    const { result, rerender } = renderHook(
      ({ value }) => useValidation({ validate, value, row }),
      { initialProps: { value: 'old' } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    rerender({ value: 'new' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(310);
    });

    expect(result.current.validation).toEqual({ status: 'valid' });
  });
});
