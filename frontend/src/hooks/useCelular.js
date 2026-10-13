import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 767.98px)';

const subscribe = (onChange) => {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
};

/** true em tela de celular (< 768px); acompanha redimensionamento/rotação. */
const useCelular = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );

export default useCelular;
