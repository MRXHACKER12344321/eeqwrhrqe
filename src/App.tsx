/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import CardapioPublico from './components/CardapioPublico';
import PainelMaster from './components/PainelMaster';
import PainelAdmin from './components/PainelAdmin';
import Landing from './components/Landing';
import ErrorBoundary from './components/ErrorBoundary';

interface RouteState {
  view: 'public' | 'master' | 'admin';
  slug: string;
}

function decodeRouteValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseRouteValue(currentLocation: Location): RouteState {
  const rawHash = decodeRouteValue(currentLocation.hash.replace(/^#\/?/, '').trim()).toLowerCase();
  const rawPath = decodeRouteValue(currentLocation.pathname.replace(/^\//, '').trim()).toLowerCase();

  console.log('📍 Route parsing:', { hash: rawHash, path: rawPath });

  if (rawHash === 'admin-master' || rawPath === 'admin-master') {
    console.log('✅ Master route detected');
    return { view: 'master', slug: '' };
  }

  if (rawHash === 'admin' || rawPath === 'admin') {
    console.log('✅ Admin route detected');
    return { view: 'admin', slug: '' };
  }

  if (rawHash.startsWith('admin/')) {
    const adminSlug = rawHash.replace(/^admin\//, '').trim();
    console.log('✅ Admin route detected with store slug:', adminSlug);
    return { view: 'admin', slug: adminSlug };
  }

  if (rawHash && rawHash !== '') {
    console.log('✅ Public route (hash) detected:', rawHash);
    return { view: 'public', slug: rawHash };
  }

  if (rawPath && rawPath !== '') {
    return { view: 'public', slug: rawPath };
  }

  return { view: 'public', slug: '' };
}

export default function App() {
  const [route, setRoute] = useState<RouteState>(() => {
    if (typeof window === 'undefined') {
      return { view: 'public', slug: '' };
    }
    return parseRouteValue(window.location);
  });

  useEffect(() => {
    console.log('🚀 App starting...');

    const handleRouteChange = () => {
      setRoute(parseRouteValue(window.location));
    };

    handleRouteChange();

    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  const content = (() => {
    if (route.view === 'master') {
      return <PainelMaster />;
    }

    if (route.view === 'admin') {
      return <PainelAdmin storeSlug={route.slug} />;
    }

    if (route.slug === '') {
      return <Landing />;
    }

    return <CardapioPublico storeSlug={route.slug} />;
  })();

  return <ErrorBoundary>{content}</ErrorBoundary>;
}



