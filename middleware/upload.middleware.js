const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userDir = path.join(uploadDir, req.user?._id?.toString() || 'temp');
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }
        cb(null, userDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type'), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max
        files: 10 // Max 10 files at once
    }
});

// Middleware wrappers
const uploadMiddleware = {
    // Single file upload
    single: (fieldName) => {
        return upload.single(fieldName);
    },

    // Multiple files upload
    array: (fieldName, maxCount) => {
        return upload.array(fieldName, maxCount);
    },

    // Multiple fields with different file counts
    fields: (fields) => {
        return upload.fields(fields);
    },

    // Any file upload (for mixed types)
    any: () => {
        return upload.any();
    },

    // Custom upload with specific limits
    custom: (options = {}) => {
        return multer({
            storage: storage,
            fileFilter: fileFilter,
            limits: {
                fileSize: options.maxSize || 100 * 1024 * 1024,
                files: options.maxFiles || 10
            }
        });
    },

    // Cleanup uploaded files on error
    cleanupOnError: (req, res, next) => {
        try {
            next();
        } catch (error) {
            // Cleanup uploaded files if error occurs
            if (req.file || req.files) {
                const files = req.file ? [req.file] : (req.files || []);
                files.forEach(file => {
                    if (file.path && fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                });
            }
            throw error;
        }
    },

    // Get file info for uploaded files
    getFileInfo: (file) => {
        return {
            originalName: file.originalname,
            filename: file.filename,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype,
            encoding: file.encoding,
            fieldname: file.fieldname
        };
    }
};

module.exports = uploadMiddleware;