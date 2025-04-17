import { useState, useRef, useCallback } from 'react';

export function useImmediateState<K, V>(initialValue: Map<K, V>) {
  const [state, setState] = useState<Map<K, V>>(initialValue);
  const ref = useRef<Map<K, V>>(initialValue);

  const setImmediateState = useCallback((key: K, value: V) => {
    ref.current.set(key, value);
    setState(new Map(ref.current));
  }, []);

  const setMultipleImmediateState = useCallback((values: Map<K, V>) => {
    const newMap = new Map(ref.current);
    values.forEach((value, key) => {
      newMap.set(key, value);
    });
    ref.current = newMap;
    setState(newMap);
  }, []);

  const deleteFromState = useCallback((key: K) => {
    ref.current.delete(key);
    setState(new Map(ref.current));
  }, []);

  const clearState = useCallback(() => {
    ref.current.clear();
    setState(new Map<K, V>());
  }, []);

  return [
    state, 
    ref, 
    setImmediateState,
    setMultipleImmediateState, 
    deleteFromState, 
    clearState
  ] as const;
}