import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import Home from './pages/Home';
import MemorialList from './pages/MemorialList';
import MemorialDetail from './pages/MemorialDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import CreateMemorial from './pages/CreateMemorial';
import MyMemorials from './pages/MyMemorials';
import Admin from './pages/Admin';
import Moderation from './pages/Moderation';
import EditMemorial from './pages/EditMemorial';
import toast from 'react-hot-toast';

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      toast.error('Please log in to continue.');
    }
  }, [loading, user]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Admin-only route wrapper
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/memorials" element={<MemorialList />} />
          <Route path="/memorial/:slug" element={<MemorialDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected */}
          <Route path="/create" element={<ProtectedRoute><CreateMemorial /></ProtectedRoute>} />
          <Route path="/my-memorials" element={<ProtectedRoute><MyMemorials /></ProtectedRoute>} />
          <Route path="/memorials/:id/edit" element={<ProtectedRoute><EditMemorial /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="/moderate" element={<AdminRoute><Moderation /></AdminRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;