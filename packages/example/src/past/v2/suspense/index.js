import React from 'react';

const LazyComponent = React.lazy(() => import('./Component'));

export default function SuspenseComponentTest(props) {
  return (
    <React.Suspense fallback="loading...">
      <LazyComponent {...props} />
    </React.Suspense>
  );
}
