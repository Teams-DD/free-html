import React, { useState, useEffect, Suspense, lazy } from 'react';
import { PublicApp } from './public/PublicApp.tsx';

const VconApp = lazy(() => import('./vcon/VconApp.tsx').then((m) => ({ default: m.VconApp })));

export default function App() {
  const [currentLocation, setCurrentLocation] = useState(() => `${window.location.pathname}${window.location.search}`);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentLocation(`${window.location.pathname}${window.location.search}`);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const locationUrl = new URL(currentLocation, window.location.origin);
  const isPublicModalRoute = locationUrl.pathname === '/vcon' &&
    (locationUrl.searchParams.has('opened') || locationUrl.searchParams.has('closed'));
  const isAdmin = !isPublicModalRoute &&
    (locationUrl.pathname === '/vcon' || locationUrl.pathname.startsWith('/vcon/'));

  if (isAdmin) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen w-full bg-zinc-950 flex items-center justify-center text-xs text-zinc-500 font-mono">
            Loading...
          </div>
        }
      >
        <VconApp />
      </Suspense>
    );
  }

  return <PublicApp />;
}
