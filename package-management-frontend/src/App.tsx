import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { PackageDetails } from './pages/PackageDetails';
import { UploadPackage } from './pages/UploadPackage';
import { Subscriptions } from './pages/Subscriptions';
import { Profile } from './pages/Profile';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/package/:packageId"
            element={
              <ProtectedRoute>
                <PackageDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/upload"
            element={
              <ProtectedRoute requireRole="OWNER">
                <UploadPackage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/subscriptions"
            element={
              <ProtectedRoute>
                <Subscriptions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
