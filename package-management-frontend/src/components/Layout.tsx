import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Package, LogOut, User } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navigation Bar */}
            <nav className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center space-x-8">
                            <Link to="/" className="flex items-center space-x-2">
                                <Package className="h-8 w-8 text-primary-600" />
                                <span className="text-xl font-bold text-gray-900">Package Manager</span>
                            </Link>

                            <div className="hidden md:flex space-x-4">
                                <Link to="/" className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium">
                                    Dashboard
                                </Link>
                                {(user?.role === 'OWNER' || user?.role === 'ADMIN') && (
                                    <Link to="/upload" className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium">
                                        Upload Package
                                    </Link>
                                )}
                                <Link to="/subscriptions" className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium">
                                    Subscriptions
                                </Link>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <Link to="/profile" className="flex items-center space-x-2 text-gray-700 hover:text-primary-600">
                                <User className="h-5 w-5" />
                                <span className="text-sm font-medium">{user?.username}</span>
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="flex items-center space-x-2 text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                <LogOut className="h-5 w-5" />
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <p className="text-center text-gray-500 text-sm">
                        © 2025 Package Management System. Powered by Hyperledger Fabric.
                    </p>
                </div>
            </footer>
        </div>
    );
};
