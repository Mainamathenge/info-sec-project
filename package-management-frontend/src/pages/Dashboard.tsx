import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import apiClient from '../api/client';
import type { Package as PackageType } from '../types';
import { Package, Search, TrendingUp } from 'lucide-react';

export const Dashboard = () => {
    const [packages, setPackages] = useState<PackageType[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        try {
            const response = await apiClient.get('/packages');
            setPackages(response.data.packages || []);
        } catch (error) {
            console.error('Failed to fetch packages:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPackages = packages.filter(pkg =>
        pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.packageId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Package Dashboard</h1>
                    <p className="text-gray-600 mt-2">Browse and manage software packages</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Packages</p>
                                <p className="text-2xl font-bold text-gray-900">{packages.length}</p>
                            </div>
                            <Package className="h-10 w-10 text-primary-600" />
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Downloads</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {packages.reduce((sum, pkg) => sum + (pkg.totalDownloads || 0), 0)}
                                </p>
                            </div>
                            <TrendingUp className="h-10 w-10 text-green-600" />
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Versions</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {packages.reduce((sum, pkg) => sum + (pkg.totalVersions || 0), 0)}
                                </p>
                            </div>
                            <Package className="h-10 w-10 text-blue-600" />
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="card">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search packages..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                </div>

                {/* Package List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="col-span-full text-center py-12">
                            <p className="text-gray-500">Loading packages...</p>
                        </div>
                    ) : filteredPackages.length === 0 ? (
                        <div className="col-span-full text-center py-12">
                            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">No packages found</p>
                        </div>
                    ) : (
                        filteredPackages.map((pkg) => (
                            <Link
                                key={pkg.packageId}
                                to={`/package/${pkg.packageId}`}
                                className="card hover:shadow-lg transition-shadow duration-200"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                                        <p className="text-sm text-gray-500">{pkg.packageId}</p>
                                    </div>
                                    <Package className="h-8 w-8 text-primary-600" />
                                </div>

                                {pkg.description && (
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{pkg.description}</p>
                                )}

                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">
                                        v{pkg.latestVersion || '1.0.0'}
                                    </span>
                                    <span className="text-gray-500">
                                        {pkg.totalDownloads || 0} downloads
                                    </span>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </Layout>
    );
};
