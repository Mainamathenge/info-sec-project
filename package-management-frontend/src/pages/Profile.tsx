import { useState } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import type { MFASetupResponse } from '../types';
import { User, Shield, ShieldOff, AlertCircle, CheckCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export const Profile = () => {
    const { user } = useAuth();
    const [showMFASetup, setShowMFASetup] = useState(false);
    const [mfaSecret, setMfaSecret] = useState('');
    const [mfaQRCode, setMfaQRCode] = useState('');
    const [mfaToken, setMfaToken] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSetupMFA = async () => {
        setError('');
        setLoading(true);

        try {
            const response = await apiClient.post<MFASetupResponse>('/auth/mfa/setup');
            setMfaSecret(response.data.secret);
            setMfaQRCode(response.data.qrCode);
            setShowMFASetup(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to setup MFA');
        } finally {
            setLoading(false);
        }
    };
    // the 
    const handleVerifyMFA = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await apiClient.post('/auth/mfa/verify', {
                secret: mfaSecret,
                token: mfaToken,
            });
            setSuccess('MFA enabled successfully!');
            setShowMFASetup(false);
            setMfaToken('');
            // Refresh page to update user state
            setTimeout(() => window.location.reload(), 2000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to verify MFA token');
        } finally {
            setLoading(false);
        }
    };

    const handleDisableMFA = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await apiClient.post('/auth/mfa/disable', { password });
            setSuccess('MFA disabled successfully!');
            setPassword('');
            // Refresh page to update user state
            setTimeout(() => window.location.reload(), 2000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to disable MFA');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-2xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
                    <p className="text-gray-600 mt-2">Manage your account settings</p>
                </div>

                {/* User Info */}
                <div className="card">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                        <User className="h-6 w-6" />
                        <span>Account Information</span>
                    </h2>

                    <div className="space-y-3">
                        <div>
                            <p className="text-sm text-gray-600">Username</p>
                            <p className="text-lg font-semibold text-gray-900">{user?.username}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Email</p>
                            <p className="text-lg font-semibold text-gray-900">{user?.email}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Role</p>
                            <p className="text-lg font-semibold text-gray-900">{user?.role}</p>
                        </div>
                    </div>
                </div>

                {/* MFA Settings */}
                <div className="card">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                        <Shield className="h-6 w-6" />
                        <span>Two-Factor Authentication</span>
                    </h2>

                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2 mb-4">
                            <CheckCircle className="h-5 w-5" />
                            <span>{success}</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2 mb-4">
                            <AlertCircle className="h-5 w-5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {user?.mfaEnabled ? (
                        <div>
                            <div className="flex items-center space-x-2 mb-4">
                                <Shield className="h-5 w-5 text-green-600" />
                                <span className="text-green-600 font-medium">MFA is enabled</span>
                            </div>

                            <form onSubmit={handleDisableMFA} className="space-y-4">
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                        Enter your password to disable MFA
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
                                <button
                                    type="submit"
                                    className="btn-secondary flex items-center space-x-2"
                                    disabled={loading}
                                >
                                    <ShieldOff className="h-5 w-5" />
                                    <span>{loading ? 'Disabling...' : 'Disable MFA'}</span>
                                </button>
                            </form>
                        </div>
                    ) : showMFASetup ? (
                        <div>
                            <p className="text-gray-700 mb-4">
                                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                            </p>

                            <div className="bg-white p-4 rounded-lg border border-gray-200 inline-block mb-4">
                                <QRCodeSVG value={mfaQRCode} size={200} />
                            </div>

                            <p className="text-sm text-gray-600 mb-4">
                                Or enter this secret manually: <code className="bg-gray-100 px-2 py-1 rounded">{mfaSecret}</code>
                            </p>

                            <form onSubmit={handleVerifyMFA} className="space-y-4">
                                <div>
                                    <label htmlFor="mfaToken" className="block text-sm font-medium text-gray-700 mb-1">
                                        Enter the 6-digit code from your app
                                    </label>
                                    <input
                                        id="mfaToken"
                                        type="text"
                                        value={mfaToken}
                                        onChange={(e) => setMfaToken(e.target.value)}
                                        className="input-field"
                                        placeholder="000000"
                                        maxLength={6}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={loading}
                                    >
                                        {loading ? 'Verifying...' : 'Verify and Enable'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowMFASetup(false)}
                                        className="btn-secondary"
                                        disabled={loading}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div>
                            <p className="text-gray-700 mb-4">
                                Add an extra layer of security to your account by enabling two-factor authentication.
                            </p>
                            <button
                                onClick={handleSetupMFA}
                                className="btn-primary flex items-center space-x-2"
                                disabled={loading}
                            >
                                <Shield className="h-5 w-5" />
                                <span>{loading ? 'Setting up...' : 'Enable MFA'}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};
