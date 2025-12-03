import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Package, AlertCircle } from 'lucide-react';

export const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<'USER' | 'OWNER'>('USER');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);

        try {
            await register(username, email, password, role);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4 py-12">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <Package className="h-16 w-16 text-primary-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
                    <p className="text-gray-600 mt-2">Join the package management system</p>
                </div>

                <div className="card">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
                                <AlertCircle className="h-5 w-5" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                                Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="input-field"
                                required
                                disabled={loading}
                                pattern="[a-zA-Z0-9_]+"
                                title="Username must be alphanumeric"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field"
                                required
                                disabled={loading}
                                minLength={8}
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                Confirm Password
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="input-field"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Role
                            </label>
                            <div className="space-y-2">
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="radio"
                                        value="USER"
                                        checked={role === 'USER'}
                                        onChange={(e) => setRole(e.target.value as 'USER')}
                                        className="w-4 h-4 text-primary-600"
                                        disabled={loading}
                                    />
                                    <span className="text-sm text-gray-700">User (Download packages)</span>
                                </label>
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="radio"
                                        value="OWNER"
                                        checked={role === 'OWNER'}
                                        onChange={(e) => setRole(e.target.value as 'OWNER')}
                                        className="w-4 h-4 text-primary-600"
                                        disabled={loading}
                                    />
                                    <span className="text-sm text-gray-700">Owner (Upload and download packages)</span>
                                </label>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                                Sign in here
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
