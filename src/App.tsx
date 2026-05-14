import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { PublicMenu } from './pages/PublicMenu';
import { Dashboard } from './pages/Dashboard';
import { PublicBooking } from './pages/PublicBooking';
import { PublicReview } from './pages/PublicReview';
import { StaffReview } from './pages/StaffReview';
import { Auth } from './pages/Auth';

import { DriverPortal } from './pages/DriverPortal';
import { ChefDashboard } from './pages/ChefDashboard';

import { useEffect } from 'react';
import { NotificationService } from './utils/notifications';

function App() {
  useEffect(() => {
    // Request notification permission on app mount
    NotificationService.requestPermission();

    // Store install prompt for later use
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
    });
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/signup" element={<Auth />} />
        <Route path="/menu/:restaurantId" element={<PublicMenu />} />
        <Route path="/book/:restaurantId" element={<PublicBooking />} />
        <Route path="/review/:restaurantId" element={<PublicReview />} />
        <Route path="/staff-review/:staffId" element={<StaffReview />} />
        <Route path="/driver/:driverId" element={<DriverPortal />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chef" element={<ChefDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
