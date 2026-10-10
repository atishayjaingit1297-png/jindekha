import { useEffect, useState } from 'react';

export type Route = 'home' | 'setup' | 'rules' | 'settings' | 'game';
const ROUTES: Route[] = ['home', 'setup', 'rules', 'settings', 'game'];

export function parseRoute(hash: string): Route {
  const r = hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(r) ? r : 'home';
}

/** Hash routing keeps the browser/Android back button working without a server rewrite config. */
export function useRoute(): [Route, (r: Route, opts?: { replace?: boolean }) => void] {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const navigate = (r: Route, opts?: { replace?: boolean }) => {
    const hash = r === 'home' ? '#/' : `#/${r}`;
    if (opts?.replace) {
      window.history.replaceState(null, '', hash);
      setRoute(r);
    } else if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
  };
  return [route, navigate];
}
