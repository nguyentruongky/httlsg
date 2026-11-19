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
import { ClergyPage } from './pages/ClergyPage';

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

const clergyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/clergy',
  component: ClergyPage,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  churchesRoute,
  departmentsRoute,
  clergyRoute,
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
