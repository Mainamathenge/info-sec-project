import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireRole?: 'USER' | 'OWNER' | 'ADMIN';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireRole }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl">Loading...</div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requireRole) {
        const roleHierarchy = { USER: 1, OWNER: 2, ADMIN: 3 };
        if (roleHierarchy[user.role] < roleHierarchy[requireRole]) {
            return <Navigate to="/" replace />;
        }
    }

    return <>{children}</>;
};
