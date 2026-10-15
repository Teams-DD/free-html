import React, { useState, useEffect, Suspense, lazy } from 'react';
import { PublicApp } from './public/PublicApp.tsx';

const VconApp = lazy(() => import('./vcon/VconApp.tsx').then((m) => ({ default: m.VconApp })));

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const isAdmin = currentPath === '/vcon' || currentPath.startsWith('/vcon/');

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
