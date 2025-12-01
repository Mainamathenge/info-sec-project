import multer from 'multer';
import path from 'path';

// Configure multer for memory storage (we'll handle file saving manually)
const storage = multer.memoryStorage();

// File filter to accept only tar.gz, tgz, and zip files
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedExtensions = ['.tar.gz', '.tgz', '.zip'];
    const fileName = file.originalname.toLowerCase();

    const isAllowed = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (isAllowed) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only .tar.gz, .tgz, and .zip files are allowed.'));
    }
};

// Create multer instance with configuration
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // Default 100MB
    }
});

// Middleware for single file upload
export const uploadSingle = upload.single('file');

// Middleware for handling multer errors
export const handleUploadError = (err: any, req: any, res: any, next: any) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'File too large. Maximum size is 100MB.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
};
