import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { PublicMenu } from './pages/PublicMenu';
import { Dashboard } from './pages/Dashboard';
import { PublicBooking } from './pages/PublicBooking';
import { PublicReview } from './pages/PublicReview';
import { StaffReview } from './pages/StaffReview';
import { Auth } from './pages/Auth';
import { Tarifs } from './pages/Tarifs';
import { DashboardDev } from './pages/DashboardDev';

import { DriverPortal } from './pages/DriverPortal';
import { ChefDashboard } from './pages/ChefDashboard';
import { ReservationDashboard } from './pages/ReservationDashboard';
import { ServerDashboard } from './pages/ServerDashboard';
import { OrderTracking } from './pages/OrderTracking';
import { PublicCheckReservation } from './pages/PublicCheckReservation';
import { GoogleReviewRedirect } from './pages/GoogleReviewRedirect';
import { OnboardingSearch } from './pages/OnboardingSearch';

import { useEffect } from 'react';
import { NotificationService } from './utils/notifications';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useConvexAuth } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary, #0a0a0a)' }}>
        <div className="btn-spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function ProtectedDevRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const authUser = useQuery(api.users.me);

  if (isLoading || authUser === undefined) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary, #0a0a0a)' }}>
        <div className="btn-spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
      </div>
    );
  }

  if (!isAuthenticated || !authUser) {
    return <Navigate to="/login" replace />;
  }

  const allowedDevUsers = ['kx7f11ha5j2x0j5m32nvq757f5872181', 'kx7bntqzah3w7jmrd2s365kz1s8acdg3'];
  if (!allowedDevUsers.includes(authUser.userId)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  useEffect(() => {
    NotificationService.requestPermission();

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
    });
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Auth key="login" />} />
          <Route path="/signup" element={<Auth key="signup" />} />
          <Route path="/tarifs" element={<Tarifs />} />
          <Route path="/menu/:restaurantId" element={<PublicMenu />} />
          <Route path="/book/:restaurantId" element={<PublicBooking />} />
          <Route path="/review/:restaurantId" element={<PublicReview />} />
          <Route path="/staff-review/:restaurantId/:staffId" element={<StaffReview />} />
          <Route path="/driver/:restaurantId/:driverId" element={<DriverPortal />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/chef/:restaurantId" element={<ChefDashboard />} />
          <Route path="/reservation/:restaurantId" element={<ReservationDashboard />} />
          <Route path="/track/:orderId" element={<OrderTracking />} />
          <Route path="/check-reservation/:restaurantId" element={<PublicCheckReservation />} />
          <Route path="/serveur/:restaurantId/:staffId" element={<ServerDashboard />} />
          <Route path="/server-dashboard/:restaurantId/:staffId" element={<ServerDashboard />} />
          <Route path="/google-review/:restaurantId" element={<GoogleReviewRedirect />} />
          <Route path="/onboarding" element={<OnboardingSearch />} />
          <Route path="/dev" element={<ProtectedDevRoute><DashboardDev /></ProtectedDevRoute>} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
