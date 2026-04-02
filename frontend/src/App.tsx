import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Payment from './pages/Payment';
import PaymentMock from './pages/PaymentMock';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import LearningPage from './pages/Learning';
import LessonPage from './pages/Lesson';
import GovernmentPage from './pages/Government';
import ExpertsPage from './pages/Experts';
import BookingPage from './pages/Booking';
import CommunityPage from './pages/Community';
import PostDetailPage from './pages/PostDetail';
import ProfilePage from './pages/Profile';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminOrders from './pages/admin/Orders';
import AdminBookings from './pages/admin/Bookings';

// Layout
import AppLayout from './components/AppLayout';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.onboardingCompleted && window.location.pathname !== '/onboarding') {
    if (user?.plan !== 'FREE') return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'ADMIN' && user?.role !== 'OPERATOR') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 公开页面 */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/payment/mock" element={<PaymentMock />} />

        {/* 需要登录 */}
        <Route path="/onboarding" element={
          <RequireAuth><Onboarding /></RequireAuth>
        } />

        {/* 主应用布局 */}
        <Route path="/" element={
          <RequireAuth><AppLayout /></RequireAuth>
        }>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="learning" element={<LearningPage />} />
          <Route path="learning/lesson/:id" element={<LessonPage />} />
          <Route path="government" element={<GovernmentPage />} />
          <Route path="experts" element={<ExpertsPage />} />
          <Route path="experts/:id/book" element={<BookingPage />} />
          <Route path="community" element={<CommunityPage />} />
          <Route path="community/:id" element={<PostDetailPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/*" element={<ProfilePage />} />
        </Route>

        {/* 后台管理 */}
        <Route path="/admin" element={
          <RequireAdmin><AdminLayout /></RequireAdmin>
        }>
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
