import { useRef } from 'react'

// https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useMemoizedFn/index.ts
export function useMemoizedFn<T extends Function>(fn: T) {
    const fnRef = useRef<T>(fn);
    fnRef.current = fn;
  
    const memoizedFn = useRef<Function>();
    if (!memoizedFn.current) {
      memoizedFn.current = function (this, ...args: any[]) {
        return fnRef.current.apply(this, args);
      };
    }
  
    return memoizedFn.current as T;
  }
  