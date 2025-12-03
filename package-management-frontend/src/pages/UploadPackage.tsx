import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import { Upload as UploadIcon, AlertCircle, CheckCircle } from 'lucide-react';

export const UploadPackage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [packageId, setPackageId] = useState('');
    const [version, setVersion] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (!file) {
            setError('Please select a file to upload');
            return;
        }

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('packageId', packageId);
            formData.append('version', version);
            formData.append('name', name);
            if (description) {
                formData.append('description', description);
            }

            await apiClient.post('/packages/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setSuccess(true);
            setTimeout(() => {
                navigate(`/package/${packageId}`);
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to upload package');
        } finally {
            setUploading(false);
        }
    };

    if (user?.role !== 'OWNER' && user?.role !== 'ADMIN') {
        return (
            <Layout>
                <div className="text-center py-12">
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-gray-600">You need to be an Owner or Admin to upload packages.</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Upload Package</h1>
                    <p className="text-gray-600 mt-2">Publish a new package version to the blockchain</p>
                </div>

                <div className="card">
                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2 mb-6">
                            <CheckCircle className="h-5 w-5" />
                            <span>Package uploaded successfully! Redirecting...</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2 mb-6">
                            <AlertCircle className="h-5 w-5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="packageId" className="block text-sm font-medium text-gray-700 mb-1">
                                Package ID
                            </label>
                            <input
                                id="packageId"
                                type="text"
                                value={packageId}
                                onChange={(e) => setPackageId(e.target.value)}
                                className="input-field"
                                placeholder="com.example.mypackage"
                                pattern="[a-z0-9.-]+"
                                title="Lowercase alphanumeric with dots and dashes"
                                required
                                disabled={uploading}
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                Use reverse domain notation (e.g., com.example.mypackage)
                            </p>
                        </div>

                        <div>
                            <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-1">
                                Version
                            </label>
                            <input
                                id="version"
                                type="text"
                                value={version}
                                onChange={(e) => setVersion(e.target.value)}
                                className="input-field"
                                placeholder="1.0.0"
                                pattern="\d+\.\d+\.\d+"
                                title="Semantic versioning (e.g., 1.0.0)"
                                required
                                disabled={uploading}
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                Follow semantic versioning (MAJOR.MINOR.PATCH)
                            </p>
                        </div>

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Package Name
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input-field"
                                placeholder="My Awesome Package"
                                required
                                disabled={uploading}
                            />
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                Description (Optional)
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="input-field resize-none"
                                placeholder="Describe your package..."
                                rows={4}
                                disabled={uploading}
                            />
                        </div>

                        <div>
                            <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
                                Package File
                            </label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary-500 transition-colors">
                                <div className="space-y-1 text-center">
                                    <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                                    <div className="flex text-sm text-gray-600">
                                        <label
                                            htmlFor="file"
                                            className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none"
                                        >
                                            <span>Upload a file</span>
                                            <input
                                                id="file"
                                                type="file"
                                                className="sr-only"
                                                onChange={handleFileChange}
                                                accept=".tar.gz,.tgz,.zip"
                                                required
                                                disabled={uploading}
                                            />
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        {file ? file.name : 'TAR.GZ, TGZ, or ZIP up to 100MB'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex space-x-4">
                            <button
                                type="submit"
                                className="flex-1 btn-primary"
                                disabled={uploading}
                            >
                                {uploading ? 'Uploading...' : 'Upload Package'}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                className="flex-1 btn-secondary"
                                disabled={uploading}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
};
