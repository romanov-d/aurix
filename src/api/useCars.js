import { useEffect, useState } from 'react';
import { listCars } from './cars.js';

export function useCars(params = {}) {
  const key = JSON.stringify(params);
  const [state, setState] = useState({ items: [], total: 0, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    listCars(params)
      .then((res) => { if (!cancelled) setState({ ...res, loading: false, error: null }); })
      .catch((e) => { if (!cancelled) setState((s) => ({ ...s, loading: false, error: e })); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
