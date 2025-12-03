export interface User {
    id: number;
    username: string;
    email: string;
    role: 'USER' | 'OWNER' | 'ADMIN';
    mfaEnabled: boolean;
    createdAt: string;
}

export interface Package {
    packageId: string;
    name: string;
    description?: string;
    ownerId: number;
    ownerUsername?: string;
    latestVersion?: string;
    totalVersions?: number;
    totalDownloads?: number;
    createdAt: string;
    updatedAt: string;
}

export interface PackageVersion {
    packageId: string;
    version: string;
    fileHash: string;
    size: number;
    publishedAt: string;
    publishedBy: string;
    status: 'ACTIVE' | 'DISCONTINUED';
    downloadCount?: number;
}

export interface Comment {
    id: number;
    packageId: string;
    userId: number;
    username: string;
    content: string;
    createdAt: string;
}

export interface Subscription {
    packageId: string;
    userId: number;
    createdAt: string;
}

export interface AuthResponse {
    token: string;
    requiresMFA?: boolean;
    user?: User;
}

export interface MFASetupResponse {
    secret: string;
    qrCode: string;
}

export interface ApiError {
    error: string;
}
