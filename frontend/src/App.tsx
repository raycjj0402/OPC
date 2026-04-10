import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import Diagnosis from './pages/Diagnosis';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Payment from './pages/Payment';
import PaymentCheckout from './pages/PaymentCheckout';
import PaymentResult from './pages/PaymentResult';
import ProfilePage from './pages/Profile';
import Register from './pages/Register';
import { useAuthStore } from './store/authStore';
import CaseLibrary from './pages/CaseLibrary';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminOrders from './pages/admin/Orders';
import AdminBookings from './pages/admin/Bookings';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequirePaid({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.plan === 'FREE') return <Navigate to="/payment" replace />;
  return <>{children}</>;
}

function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.plan === 'FREE') return <Navigate to="/payment" replace />;
  if (!user?.onboardingCompleted) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'ADMIN' && user?.role !== 'OPERATOR') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/payment"
          element={
            <RequireAuth>
              <Payment />
            </RequireAuth>
          }
        />
        <Route
          path="/payment/result"
          element={
            <RequireAuth>
              <PaymentResult />
            </RequireAuth>
          }
        />
        <Route
          path="/payment/checkout"
          element={
            <RequireAuth>
              <PaymentCheckout />
            </RequireAuth>
          }
        />
        <Route
          path="/onboarding"
          element={
            <RequirePaid>
              <Onboarding />
            </RequirePaid>
          }
        />

        <Route
          path="/"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route
            path="diagnosis"
            element={
              <RequireOnboarding>
                <Diagnosis />
              </RequireOnboarding>
            }
          />
          <Route
            path="cases"
            element={
              <RequireOnboarding>
                <CaseLibrary />
              </RequireOnboarding>
            }
          />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="bookings" element={<AdminBookings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
