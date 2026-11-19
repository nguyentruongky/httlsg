import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { ChurchesPage } from './pages/ChurchesPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { PastorPage } from './pages/PastorPage';

const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
});

const churchesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/churches',
  component: ChurchesPage,
});

const departmentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/departments',
  component: DepartmentsPage,
});

const pastorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/giao-pham',
  component: PastorPage,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  churchesRoute,
  departmentsRoute,
  pastorRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
