import { useState, useRef, useCallback } from 'react';

export function useImmediateMapState<K, V>(initialValue: Map<K, V>) {
  const [state, setState] = useState<Map<K, V>>(initialValue);
  const ref = useRef<Map<K, V>>(initialValue);

  const setImmediateMapState = useCallback((key: K, value: V) => {
    ref.current.set(key, value);
    setState(new Map(ref.current));
  }, []);

  const setMultipleImmediateMapState = useCallback((values: Map<K, V>) => {
    const newMap = new Map(ref.current);
    values.forEach((value, key) => {
      newMap.set(key, value);
    });
    ref.current = newMap;
    setState(newMap);
  }, []);

  const deleteFromMapState = useCallback((key: K) => {
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
    setImmediateMapState,
    setMultipleImmediateMapState, 
    deleteFromMapState, 
    clearState
  ] as const;
}

export function useImmediateState<T>(initialValue: T) {
  const [state, setState] = useState<T>(initialValue);
  const ref = useRef<T>(initialValue);

  const setImmediateState = useCallback((valueOrFunction: T | ((prev: T) => T)) => {
    if (typeof valueOrFunction === 'function') {
      // Cast to the function type since TypeScript can't infer this correctly
      const newValue = (valueOrFunction as (prev: T) => T)(ref.current);
      ref.current = newValue;
      setState(newValue);
    } else {
      ref.current = valueOrFunction;
      setState(valueOrFunction);
    }
  }, []);

  return [state, ref, setImmediateState] as const;
}