import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Package, AlertCircle } from 'lucide-react';

export const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [mfaToken, setMfaToken] = useState('');
    const [requiresMFA, setRequiresMFA] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(username, password, mfaToken || undefined);
            navigate('/');
        } catch (err: any) {
            if (err.message === 'MFA_REQUIRED') {
                setRequiresMFA(true);
                setError('Please enter your MFA token');
            } else {
                setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <Package className="h-16 w-16 text-primary-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Package Manager</h1>
                    <p className="text-gray-600 mt-2">Sign in to your account</p>
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
                            />
                        </div>

                        {requiresMFA && (
                            <div>
                                <label htmlFor="mfaToken" className="block text-sm font-medium text-gray-700 mb-1">
                                    MFA Token
                                </label>
                                <input
                                    id="mfaToken"
                                    type="text"
                                    value={mfaToken}
                                    onChange={(e) => setMfaToken(e.target.value)}
                                    className="input-field"
                                    placeholder="6-digit code"
                                    maxLength={6}
                                    disabled={loading}
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                                Register here
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
