import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import apiClient from '../api/client';
import type { Package as PackageType } from '../types';
import { Package, Bell } from 'lucide-react';

export const Subscriptions = () => {
    const [subscriptions, setSubscriptions] = useState<PackageType[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const fetchSubscriptions = async () => {
        try {
            const response = await apiClient.get('/subscriptions');
            setSubscriptions(response.data.subscriptions || []);
        } catch (error) {
            console.error('Failed to fetch subscriptions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUnsubscribe = async (packageId: string) => {
        try {
            await apiClient.delete(`/packages/${packageId}/subscribe`);
            setSubscriptions(subscriptions.filter(pkg => pkg.package_id !== packageId));
        } catch (error) {
            console.error('Failed to unsubscribe:', error);
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Subscriptions</h1>
                    <p className="text-gray-600 mt-2">Packages you're subscribed to for updates</p>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Loading subscriptions...</p>
                    </div>
                ) : subscriptions.length === 0 ? (
                    <div className="card text-center py-12">
                        <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Subscriptions</h2>
                        <p className="text-gray-600 mb-6">You haven't subscribed to any packages yet.</p>
                        <Link to="/" className="btn-primary inline-block">
                            Browse Packages
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {subscriptions.map((pkg) => (
                            <div key={pkg.package_id} className="card">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                                        <p className="text-sm text-gray-500">{pkg.package_id}</p>
                                    </div>
                                    <Package className="h-8 w-8 text-primary-600" />
                                </div>

                                {pkg.description && (
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{pkg.description}</p>
                                )}

                                <div className="flex space-x-2 mt-4">
                                    <Link
                                        to={`/package/${pkg.package_id}`}
                                        className="flex-1 btn-primary text-center"
                                    >
                                        View Details
                                    </Link>
                                    <button
                                        onClick={() => handleUnsubscribe(pkg.package_id)}
                                        className="btn-secondary"
                                    >
                                        Unsubscribe
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
};
