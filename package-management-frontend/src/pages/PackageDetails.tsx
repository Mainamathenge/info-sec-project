import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import apiClient from '../api/client';
import type { Package as PackageType, PackageVersion, Comment } from '../types';
import { Package, Download, CheckCircle, XCircle, Bell, BellOff, MessageSquare } from 'lucide-react';

export const PackageDetails = () => {
    const { packageId } = useParams<{ packageId: string }>();
    const [pkg, setPkg] = useState<PackageType | null>(null);
    const [versions, setVersions] = useState<PackageVersion[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (packageId) {
            fetchPackageDetails();
            fetchVersions();
            fetchComments();
            checkSubscription();
        }
    }, [packageId]);

    const fetchPackageDetails = async () => {
        try {
            const response = await apiClient.get(`/packages/${packageId}`);
            setPkg(response.data);
        } catch (error) {
            console.error('Failed to fetch package:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchVersions = async () => {
        try {
            const response = await apiClient.get(`/packages/${packageId}/versions`);
            setVersions(response.data.versions || []);
        } catch (error) {
            console.error('Failed to fetch versions:', error);
        }
    };

    const fetchComments = async () => {
        try {
            const response = await apiClient.get(`/packages/${packageId}/comments`);
            setComments(response.data.comments || []);
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        }
    };

    const checkSubscription = async () => {
        try {
            const response = await apiClient.get('/subscriptions');
            const subscriptions = response.data.subscriptions || [];
            setIsSubscribed(subscriptions.some((s: PackageType) => s.packageId === packageId));
        } catch (error) {
            console.error('Failed to check subscription:', error);
        }
    };

    const handleSubscribe = async () => {
        try {
            if (isSubscribed) {
                await apiClient.delete(`/packages/${packageId}/subscribe`);
                setIsSubscribed(false);
            } else {
                await apiClient.post(`/packages/${packageId}/subscribe`);
                setIsSubscribed(true);
            }
        } catch (error) {
            console.error('Failed to toggle subscription:', error);
        }
    };

    const handleDownload = async (version: string) => {
        try {
            const response = await apiClient.get(`/packages/${packageId}/${version}/download-file`, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${packageId}-${version}.tar.gz`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Failed to download package:', error);
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            await apiClient.post(`/packages/${packageId}/comments`, {
                content: newComment,
            });
            setNewComment('');
            fetchComments();
        } catch (error) {
            console.error('Failed to add comment:', error);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="text-center py-12">
                    <p className="text-gray-500">Loading package details...</p>
                </div>
            </Layout>
        );
    }

    if (!pkg) {
        return (
            <Layout>
                <div className="text-center py-12">
                    <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Package not found</p>
                    <Link to="/" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
                        Back to Dashboard
                    </Link>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="card">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900">{pkg.name}</h1>
                            <p className="text-gray-600 mt-1">{pkg.packageId}</p>
                            {pkg.description && (
                                <p className="text-gray-700 mt-4">{pkg.description}</p>
                            )}
                        </div>
                        <button
                            onClick={handleSubscribe}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${isSubscribed
                                ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                                : 'bg-primary-600 hover:bg-primary-700 text-white'
                                }`}
                        >
                            {isSubscribed ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                            <span>{isSubscribed ? 'Unsubscribe' : 'Subscribe'}</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
                        <div>
                            <p className="text-sm text-gray-600">Latest Version</p>
                            <p className="text-lg font-semibold text-gray-900">v{pkg.latestVersion || '1.0.0'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Downloads</p>
                            <p className="text-lg font-semibold text-gray-900">{pkg.totalDownloads || 0}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Owner</p>
                            <p className="text-lg font-semibold text-gray-900">{pkg.ownerUsername || 'Unknown'}</p>
                        </div>
                    </div>
                </div>

                {/* Versions */}
                <div className="card">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Versions</h2>
                    <div className="space-y-3">
                        {versions.length === 0 ? (
                            <p className="text-gray-500">No versions available</p>
                        ) : (
                            versions.map((version) => (
                                <div
                                    key={version.version}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3">
                                            <span className="font-semibold text-gray-900">v{version.version}</span>
                                            {version.status === 'ACTIVE' ? (
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-red-600" />
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Published by {version.publishedBy} • {new Date(version.publishedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDownload(version.version)}
                                        className="flex items-center space-x-2 btn-primary"
                                        disabled={version.status !== 'ACTIVE'}
                                    >
                                        <Download className="h-4 w-4" />
                                        <span>Download</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Comments */}
                <div className="card">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                        <MessageSquare className="h-6 w-6" />
                        <span>Comments</span>
                    </h2>

                    <form onSubmit={handleAddComment} className="mb-6">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            className="input-field resize-none"
                            rows={3}
                        />
                        <button type="submit" className="btn-primary mt-2">
                            Post Comment
                        </button>
                    </form>

                    <div className="space-y-4">
                        {comments.length === 0 ? (
                            <p className="text-gray-500">No comments yet</p>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.id} className="border-l-4 border-primary-600 pl-4 py-2">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <span className="font-semibold text-gray-900">{comment.username}</span>
                                        <span className="text-sm text-gray-500">
                                            {new Date(comment.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-gray-700">{comment.content}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};
