import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import apiClient from '../api/client';
import type { Package as PackageType, PackageVersion, Comment } from '../types';
import { Package, Download, CheckCircle, XCircle, Bell, BellOff, MessageSquare, Trash2, Upload, Shield } from 'lucide-react';

export const PackageDetails = () => {
    const { packageId } = useParams<{ packageId: string }>();
    const [pkg, setPkg] = useState<PackageType | null>(null);
    const [versions, setVersions] = useState<PackageVersion[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [showDiscontinueModal, setShowDiscontinueModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedVersion, setSelectedVersion] = useState('');
    const [validationResult, setValidationResult] = useState<{
        valid: boolean;
        expectedHash: string;
        actualHash: string;
        message: string;
    } | null>(null);
    const [validating, setValidating] = useState(false);

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
            // Since we don't have a versions endpoint, we'll get the latest version from package details
            // In a real scenario, you might query blockchain or have a dedicated endpoint
            const response = await apiClient.get(`/packages/${packageId}`);
            // For now, create a single version entry from the package data
            if (response.data) {
                const latestVersion = response.data.latestVersion || '1.0.0';
                // Try to get version details from blockchain
                try {
                    const versionResponse = await apiClient.get(`/packages/${packageId}/${latestVersion}`);
                    setVersions([{
                        packageId: packageId!,
                        version: latestVersion,
                        fileHash: versionResponse.data.fileHash || '',
                        size: versionResponse.data.size || 0,
                        status: versionResponse.data.status || 'ACTIVE',
                        publishedBy: versionResponse.data.publishedBy || 'Unknown',
                        publishedAt: versionResponse.data.publishedAt || new Date().toISOString(),
                    }]);
                } catch (versionError) {
                    // If version details fail, just show basic info
                    setVersions([{
                        packageId: packageId!,
                        version: latestVersion,
                        fileHash: '',
                        size: 0,
                        status: 'ACTIVE',
                        publishedBy: 'Unknown',
                        publishedAt: new Date().toISOString(),
                    }]);
                }
            }
        } catch (error) {
            console.error('Failed to fetch versions:', error);
        }
    };

    const fetchComments = async () => {
        try {
            // Get package to find latest version
            const pkgResponse = await apiClient.get(`/packages/${packageId}`);
            const latestVersion = pkgResponse.data.latestVersion || '1.0.0';

            // Fetch comments for the latest version
            const response = await apiClient.get(`/comments/${packageId}/${latestVersion}`);
            setComments(response.data.comments || []);
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        }
    };

    const checkSubscription = async () => {
        try {
            const response = await apiClient.get('/subscriptions');
            const subscriptions = response.data.subscriptions || [];
            setIsSubscribed(subscriptions.some((s: PackageType) => s.package_id === packageId));
        } catch (error) {
            console.error('Failed to check subscription:', error);
        }
    };

    const handleSubscribe = async () => {
        try {
            if (isSubscribed) {
                await apiClient.delete(`/subscriptions/${packageId}`);
                setIsSubscribed(false);
            } else {
                await apiClient.post(`/subscriptions/${packageId}`);
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
            // Get package to find latest version
            const pkgResponse = await apiClient.get(`/packages/${packageId}`);
            const latestVersion = pkgResponse.data.latestVersion || '1.0.0';

            await apiClient.post(`/comments/${packageId}/${latestVersion}`, {
                commentText: newComment,
            });
            setNewComment('');
            fetchComments();
        } catch (error) {
            console.error('Failed to add comment:', error);
        }
    };

    const handleDiscontinue = async () => {
        try {
            await apiClient.delete(`/packages/${packageId}`);
            alert('Package discontinued successfully');
            window.location.href = '/';
        } catch (error: any) {
            console.error('Failed to discontinue package:', error);
            alert(error.response?.data?.error || 'Failed to discontinue package');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setValidationResult(null);
        }
    };

    const handleValidate = async () => {
        if (!selectedFile || !selectedVersion) {
            alert('Please select a file and version');
            return;
        }

        setValidating(true);
        setValidationResult(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const response = await apiClient.post(
                `/packages/${packageId}/${selectedVersion}/validate-file`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            setValidationResult(response.data);
        } catch (error: any) {
            console.error('Failed to validate file:', error);
            alert(error.response?.data?.error || 'Failed to validate file');
        } finally {
            setValidating(false);
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
                            <p className="text-gray-600 mt-1">{pkg.package_id}</p>
                            {pkg.description && (
                                <p className="text-gray-700 mt-4">{pkg.description}</p>
                            )}
                        </div>
                        <div className="flex items-center space-x-3">
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

                            {/* Discontinue button - show for authenticated users */}
                            <button
                                onClick={() => setShowDiscontinueModal(true)}
                                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors bg-red-600 hover:bg-red-700 text-white"
                                title="Discontinue this package"
                            >
                                <Trash2 className="h-5 w-5" />
                                <span>Discontinue</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200">
                        <div>
                            <p className="text-sm text-gray-600">Latest Version</p>
                            <p className="text-lg font-semibold text-gray-900">v1.0.0</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Package ID</p>
                            <p className="text-lg font-semibold text-gray-900">{pkg.package_id}</p>
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

                {/* Package Validation */}
                <div className="card">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                        <Shield className="h-6 w-6 text-primary-600" />
                        <span>Validate Package File</span>
                    </h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Upload a package file to verify its integrity against the blockchain hash
                    </p>

                    <div className="space-y-4">
                        {/* Version Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Version
                            </label>
                            <select
                                value={selectedVersion}
                                onChange={(e) => setSelectedVersion(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="">Choose a version...</option>
                                {versions.map((version) => (
                                    <option key={version.version} value={version.version}>
                                        v{version.version}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* File Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Upload File
                            </label>
                            <div className="flex items-center space-x-3">
                                <label className="flex-1 flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 transition-colors">
                                    <Upload className="h-5 w-5 text-gray-400 mr-2" />
                                    <span className="text-sm text-gray-600">
                                        {selectedFile ? selectedFile.name : 'Choose file to validate'}
                                    </span>
                                    <input
                                        type="file"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        accept=".tar.gz,.zip,.tgz"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Validate Button */}
                        <button
                            onClick={handleValidate}
                            disabled={!selectedFile || !selectedVersion || validating}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                        >
                            <Shield className="h-5 w-5" />
                            <span>{validating ? 'Validating...' : 'Validate File'}</span>
                        </button>

                        {/* Validation Result */}
                        {validationResult && (
                            <div className={`p-4 rounded-lg border-2 ${validationResult.valid
                                    ? 'bg-green-50 border-green-500'
                                    : 'bg-red-50 border-red-500'
                                }`}>
                                <div className="flex items-center space-x-2 mb-3">
                                    {validationResult.valid ? (
                                        <CheckCircle className="h-6 w-6 text-green-600" />
                                    ) : (
                                        <XCircle className="h-6 w-6 text-red-600" />
                                    )}
                                    <h3 className={`font-bold ${validationResult.valid ? 'text-green-900' : 'text-red-900'
                                        }`}>
                                        {validationResult.message}
                                    </h3>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="font-medium text-gray-700">Expected Hash:</span>
                                        <p className="font-mono text-xs text-gray-600 break-all mt-1">
                                            {validationResult.expectedHash}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-gray-700">Actual Hash:</span>
                                        <p className="font-mono text-xs text-gray-600 break-all mt-1">
                                            {validationResult.actualHash}
                                        </p>
                                    </div>
                                </div>
                            </div>
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
                                            {new Date(comment.created_at).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <p className="text-gray-700">{comment.comment_text}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Discontinue Confirmation Modal */}
                {showDiscontinueModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                            <div className="flex items-center space-x-3 mb-4">
                                <Trash2 className="h-6 w-6 text-red-600" />
                                <h3 className="text-lg font-bold text-gray-900">Discontinue Package</h3>
                            </div>
                            <p className="text-gray-700 mb-6">
                                Are you sure you want to discontinue <strong>{pkg?.name}</strong>?
                                This action will delete the package and all its files. Subscribers will be notified.
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowDiscontinueModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDiscontinueModal(false);
                                        handleDiscontinue();
                                    }}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                                >
                                    Discontinue Package
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};
