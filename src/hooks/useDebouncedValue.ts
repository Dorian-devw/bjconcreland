import { useState, useEffect } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return debouncedValue;
}
