import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import SKUTracking from './pages/SKUTracking';
import StagePage from './pages/StagePage';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Users from './pages/Users';

const Protected = ({ children, roles }) => {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<Protected><Layout /></Protected>}>
        <Route index element={<Protected roles={['admin','production_manager']}><Dashboard /></Protected>} />
        <Route path="orders" element={<Protected roles={['admin','production_manager']}><Orders /></Protected>} />
        <Route path="sku" element={<Protected roles={['admin','production_manager']}><SKUTracking /></Protected>} />
        <Route path="cutting" element={<Protected roles={['admin','production_manager','cutting_operator']}><StagePage stage="cutting" /></Protected>} />
        <Route path="stitching" element={<Protected roles={['admin','production_manager','stitching_operator']}><StagePage stage="stitching" /></Protected>} />
        <Route path="buttons" element={<Protected roles={['admin','production_manager','button_operator']}><StagePage stage="buttons" /></Protected>} />
        <Route path="checking" element={<Protected roles={['admin','production_manager','checking_operator']}><StagePage stage="checking" /></Protected>} />
        <Route path="ironing" element={<Protected roles={['admin','production_manager','ironing_operator']}><StagePage stage="ironing" /></Protected>} />
        <Route path="stock" element={<Protected roles={['admin','production_manager','store_manager']}><StagePage stage="stock" /></Protected>} />
        <Route path="inventory" element={<Protected roles={['admin','production_manager','store_manager']}><Inventory /></Protected>} />
        <Route path="reports" element={<Protected roles={['admin','production_manager']}><Reports /></Protected>} />
        <Route path="notifications" element={<Protected><Notifications /></Protected>} />
        <Route path="users" element={<Protected roles={['admin']}><Users /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontSize: 13 } }} />
      </BrowserRouter>
    </AuthProvider>
  );
}
