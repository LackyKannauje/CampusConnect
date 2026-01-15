const cloudinary = require('cloudinary').v2;

const configureCloudinary = () => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
    });

    console.log('✅ Cloudinary Configured');
    return cloudinary;
};

const uploadOptions = {
    // Image upload options
    image: {
        folder: 'college_updates/images',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [
            { width: 1000, height: 1000, crop: 'limit' },
            { quality: 'auto' }
        ],
        max_file_size: 10 * 1024 * 1024 // 10MB
    },

    // Video upload options
    video: {
        folder: 'college_updates/videos',
        allowed_formats: ['mp4', 'avi', 'mov', 'mkv', 'webm'],
        resource_type: 'video',
        transformation: [
            { width: 1280, height: 720, crop: 'limit' }
        ],
        max_file_size: 100 * 1024 * 1024 // 100MB
    },

    // Document upload options
    document: {
        folder: 'college_updates/documents',
        allowed_formats: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt'],
        resource_type: 'raw',
        max_file_size: 50 * 1024 * 1024 // 50MB
    }
};

module.exports = { configureCloudinary, uploadOptions };