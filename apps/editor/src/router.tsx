import { useState, useEffect } from 'react';

export type RoutePath = '/' | '/editor' | '/pages' | '/settings' | '/styleguide' | '/privacy';

export function parseCurrentRoute(): RoutePath {
  const hash = window.location.hash;
  if (hash.startsWith('#/')) {
    const route = hash.slice(1).split('?')[0] as RoutePath;
    if (['/', '/editor', '/pages', '/settings', '/styleguide', '/privacy'].includes(route)) {
      return route;
    }
  } else if (hash === '#styleguide') {
    return '/styleguide';
  } else if (hash === '#privacy') {
    return '/privacy';
  }

  const path = window.location.pathname.split('?')[0] as RoutePath;
  if (['/', '/editor', '/pages', '/settings', '/styleguide', '/privacy'].includes(path)) {
    return path;
  }

  return '/';
}

export function navigateTo(route: string): void {
  window.location.hash = `#${route}`;
}

export function useRouter(): { currentRoute: RoutePath; navigate: (route: string) => void } {
  const [currentRoute, setCurrentRoute] = useState<RoutePath>(parseCurrentRoute);

  useEffect(() => {
    const handleNavigation = () => {
      setCurrentRoute(parseCurrentRoute());
    };

    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('popstate', handleNavigation);

    return () => {
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  return { currentRoute, navigate: navigateTo };
}
