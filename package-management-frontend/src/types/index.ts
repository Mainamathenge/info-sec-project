export interface User {
    id: number;
    username: string;
    email: string;
    role: 'USER' | 'OWNER' | 'ADMIN';
    mfaEnabled: boolean;
    createdAt: string;
}

export interface Package {
    package_id: string;
    owner_id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
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
    id: string;
    package_id: string;
    version: string;
    user_id: string;
    username: string;
    comment_text: string;
    rating: number | null;
    created_at: string;
    updated_at: string;
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
