import { createBrowserRouter, Navigate, Outlet, RouterProvider, ScrollRestoration } from 'react-router-dom';
import { Gate } from './lib/IndexContext.tsx';
import { useVisibilityFlag } from './lib/hooks.ts';
import { Home } from './pages/Home.tsx';
import { MapPage } from './pages/MapPage.tsx';
import { WishPage } from './pages/WishPage.tsx';

const Root = () => {
  useVisibilityFlag();
  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  );
};

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/:type', element: <MapPage /> },
      { path: '/:type/:date', element: <WishPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export const App = () => (
  <Gate>
    <RouterProvider router={router} />
  </Gate>
);
