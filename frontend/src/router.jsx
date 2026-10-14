import React, { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, Outlet, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RouteErrorBoundary from './components/common/RouteErrorBoundary';

// Route-level chunks keep the initial public page light.
const Home = lazy(() => import('./pages/public/Home'));
const About = lazy(() => import('./pages/public/About'));
const Domains = lazy(() => import('./pages/public/Domains'));
const DomainDetail = lazy(() => import('./pages/public/DomainDetail'));
const Team = lazy(() => import('./pages/public/Team'));
const Gallery = lazy(() => import('./pages/public/Gallery'));
const Events = lazy(() => import('./pages/public/Events'));
const EventDetail = lazy(() => import('./pages/public/EventDetail'));
const PostDetail = lazy(() => import('./pages/public/PostDetail'));
const Achievements = lazy(() => import('./pages/public/Achievements'));
const Announcements = lazy(() => import('./pages/public/Announcements'));
const Contact = lazy(() => import('./pages/public/Contact'));
const Login = lazy(() => import('./pages/auth/Login'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const DashboardLayout = lazy(() => import('./components/layout/DashboardLayout'));
const MemberDashboard = lazy(() => import('./pages/dashboard/MemberDashboard'));
const SubmitPost = lazy(() => import('./pages/dashboard/SubmitPost'));
const DomainAdminQueue = lazy(() => import('./pages/dashboard/DomainAdminQueue'));
const AttendancePage = lazy(() => import('./pages/dashboard/AttendancePage'));
const MeetingDetailPage = lazy(() => import('./pages/dashboard/MeetingDetailPage'));
const AdminControl = lazy(() => import('./pages/dashboard/AdminControl'));
const AdminMembers = lazy(() => import('./pages/dashboard/AdminMembers'));
const TasksPage = lazy(() => import('./pages/dashboard/TasksPage'));
const TaskDetailPage = lazy(() => import('./pages/dashboard/TaskDetailPage'));
const NotificationsPage = lazy(() => import('./pages/dashboard/NotificationsPage'));
const ContentAdminPage = lazy(() => import('./pages/dashboard/ContentAdminPage'));
const AuditPage = lazy(() => import('./pages/dashboard/AuditPage'));
const SystemSettingsPage = lazy(() => import('./pages/dashboard/SystemSettingsPage'));
const ProfilePage = lazy(() => import('./pages/dashboard/ProfilePage'));
const GroupsPage = lazy(() => import('./pages/dashboard/GroupsPage'));
const lazyElement = (element) => <Suspense fallback={<div className="min-h-[50vh] animate-pulse bg-white/[.02]" aria-label="Loading page" />}>{element}</Suspense>;

// Public Shell Layout
const PublicLayout = () => {
  const location = useLocation();
  useEffect(() => {
    const routeTitles = { '/': 'The Impeccables | Impeccable Minds. Limitless Creativity.', '/about': 'About | The Impeccables', '/domains': 'Creative Domains | The Impeccables', '/gallery': 'Gallery | The Impeccables', '/events': 'Events | The Impeccables', '/team': 'Our Team | The Impeccables', '/contact': 'Contact | The Impeccables' };
    document.title = routeTitles[location.pathname] || (location.pathname.startsWith('/events/') ? 'Event | The Impeccables' : 'The Impeccables');
    let description = document.querySelector('meta[name="description"]');
    if (!description) { description = document.createElement('meta'); description.name = 'description'; document.head.append(description); }
    description.content = 'Discover The Impeccables, KIET’s multidimensional cultural society for art, ideas, expression and community.';
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'The Impeccables',
      url: window.location.origin,
      description: description.content,
      logo: `${window.location.origin}/impeccables-logo.png`,
      parentOrganization: { '@type': 'EducationalOrganization', name: 'KIET Deemed to be University' },
    };
    let structuredDataScript = document.querySelector('#site-structured-data');
    if (!structuredDataScript) {
      structuredDataScript = document.createElement('script');
      structuredDataScript.id = 'site-structured-data';
      structuredDataScript.type = 'application/ld+json';
      document.head.append(structuredDataScript);
    }
    structuredDataScript.textContent = JSON.stringify(structuredData);
  }, [location.pathname]);
  return (
    <div className="flex flex-col min-h-screen bg-[#07070a] text-gray-100">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

// Dashboard Shell Layout with Toasts
const AuthenticatedShell = () => {
  return (
    <>
      <DashboardLayout />
    </>
  );
};

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: '/', element: lazyElement(<Home />) },
      { path: '/about', element: lazyElement(<About />) },
      { path: '/domains', element: lazyElement(<Domains />) },
      { path: '/domains/:slug', element: lazyElement(<DomainDetail />) },
      { path: '/team', element: lazyElement(<Team />) },
      { path: '/gallery', element: lazyElement(<Gallery />) },
      { path: '/gallery/:slug', element: lazyElement(<PostDetail />) },
      { path: '/events', element: lazyElement(<Events />) },
      { path: '/events/:slug', element: lazyElement(<EventDetail />) },
      { path: '/achievements', element: lazyElement(<Achievements />) },
      { path: '/announcements', element: lazyElement(<Announcements />) },
      { path: '/contact', element: lazyElement(<Contact />) },
      { path: '/login', element: lazyElement(<Login />) },
      { path: '/forgot-password', element: lazyElement(<ForgotPassword />) },
      { path: '/reset-password', element: lazyElement(<ResetPassword />) },
    ],
  },
  {
    path: '/meetings/:meetingId',
    element: <ProtectedRoute>{lazyElement(<DashboardLayout />)}</ProtectedRoute>,
    errorElement: <RouteErrorBoundary />,
    children: [{ index: true, element: lazyElement(<MeetingDetailPage />) }],
  },
  {
    path: '/tasks/:taskId',
    element: <ProtectedRoute>{lazyElement(<DashboardLayout />)}</ProtectedRoute>,
    errorElement: <RouteErrorBoundary />,
    children: [{ index: true, element: lazyElement(<TaskDetailPage />) }],
  },
  {
    path: '/dashboard',
    element: (
        <ProtectedRoute>
        {lazyElement(<AuthenticatedShell />)}
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <MemberDashboard /> },
      { path: 'submit', element: <SubmitPost /> },
      {
        path: 'approvals',
        element: (
          <ProtectedRoute allowedRoles={['domain_admin', 'admin', 'super_admin']}>
            <DomainAdminQueue />
          </ProtectedRoute>
        ),
      },
      { path: 'attendance', element: <AttendancePage /> },
      { path: 'groups', element: lazyElement(<GroupsPage />) },
      { path: 'groups/:groupId', element: lazyElement(<GroupsPage />) },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'content', element: <ProtectedRoute allowedRoles={['admin', 'super_admin']}><ContentAdminPage /></ProtectedRoute> },
      { path: 'audit', element: <ProtectedRoute allowedRoles={['super_admin']}><AuditPage /></ProtectedRoute> },
      { path: 'settings', element: <SystemSettingsPage /> },
      {
        path: 'members',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <AdminMembers />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <AdminControl />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    element: (
      <PublicLayout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-6xl font-black text-purple-400 font-mono">404</h1>
          <h2 className="text-2xl font-bold text-white mt-2">Page Not Found</h2>
          <p className="mt-2 text-gray-400">The requested creative destination does not exist.</p>
          <a
            href="/"
            className="mt-6 px-6 py-2.5 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-500 transition-colors"
          >
            Return to Home
          </a>
        </div>
      </PublicLayout>
    ),
  },
]);

export default router;
