// const cloudinary = require('../../config/cloudinary');

// class CloudinaryService {
//     constructor() {
//         this.cloudinary = cloudinary.configureCloudinary();
//         this.uploadOptions = cloudinary.uploadOptions;
//     }

//     // Determine resource type based on mime type
//     getResourceType(mimeType) {
//         if (mimeType.startsWith('image/')) {
//             return 'image';
//         } else if (mimeType.startsWith('video/')) {
//             return 'video';
//         } else if (mimeType.startsWith('audio/')) {
//             return 'video'; // Cloudinary treats audio as video
//         } else {
//             return 'raw';
//         }
//     }

//     // Get folder based on resource type
//     getFolder(resourceType, collegeId = null) {
//         const baseFolder = 'college_updates';
//         let folder = `${baseFolder}/${resourceType}s`;
        
//         if (collegeId) {
//             folder = `${folder}/college_${collegeId}`;
//         }
        
//         return folder;
//     }

//     // Upload file to Cloudinary
//     async uploadFile(fileBuffer, options) {
//         return new Promise((resolve, reject) => {
//             const uploadStream = this.cloudinary.uploader.upload_stream(
//                 options,
//                 (error, result) => {
//                     if (error) {
//                         reject(error);
//                     } else {
//                         resolve(result);
//                     }
//                 }
//             );

//             uploadStream.end(fileBuffer);
//         });
//     }

//     // Upload from file path
//     async uploadFromPath(filePath, options) {
//         return new Promise((resolve, reject) => {
//             this.cloudinary.uploader.upload(filePath, options, (error, result) => {
//                 if (error) {
//                     reject(error);
//                 } else {
//                     resolve(result);
//                 }
//             });
//         });
//     }

//     // Upload file with automatic type detection
//     async uploadMediaFile(file, user, collegeId = null) {
//         try {
//             const resourceType = this.getResourceType(file.mimetype);
//             const folder = this.getFolder(resourceType, collegeId);
            
//             // Get upload options based on resource type
//             let uploadOptions = {
//                 folder: folder,
//                 resource_type: resourceType,
//                 public_id: `user_${user._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
//             };

//             // Add type-specific options
//             if (resourceType === 'image') {
//                 uploadOptions = {
//                     ...uploadOptions,
//                     ...this.uploadOptions.image,
//                     transformation: [
//                         { width: 1200, crop: 'limit' },
//                         { quality: 'auto:good' }
//                     ]
//                 };
//             } else if (resourceType === 'video') {
//                 uploadOptions = {
//                     ...uploadOptions,
//                     ...this.uploadOptions.video,
//                     eager: [
//                         { width: 640, height: 360, crop: 'scale' }
//                     ]
//                 };
//             } else {
//                 uploadOptions = {
//                     ...uploadOptions,
//                     ...this.uploadOptions.document
//                 };
//             }

//             // Upload the file
//             const result = await this.uploadFromPath(file.path, uploadOptions);

//             // Generate thumbnail URL for images
//             let thumbnailUrl = result.secure_url;
//             if (resourceType === 'image') {
//                 const parts = result.secure_url.split('/upload/');
//                 thumbnailUrl = `${parts[0]}/upload/w_300,h_300,c_fill/${parts[1]}`;
//             } else if (resourceType === 'video' && result.eager && result.eager[0]) {
//                 thumbnailUrl = result.eager[0].secure_url;
//             }

//             return {
//                 success: true,
//                 data: {
//                     url: result.secure_url,
//                     public_id: result.public_id,
//                     format: result.format,
//                     resource_type: result.resource_type,
//                     width: result.width,
//                     height: result.height,
//                     bytes: result.bytes,
//                     duration: result.duration,
//                     thumbnail_url: thumbnailUrl,
//                     raw: result
//                 }
//             };

//         } catch (error) {
//             console.error('Cloudinary upload error:', error);
//             return {
//                 success: false,
//                 error: error.message
//             };
//         }
//     }

//     // Delete file from Cloudinary
//     async deleteFile(publicId, resourceType = 'image') {
//         return new Promise((resolve, reject) => {
//             this.cloudinary.uploader.destroy(publicId, {
//                 resource_type: resourceType
//             }, (error, result) => {
//                 if (error) {
//                     reject(error);
//                 } else {
//                     resolve(result);
//                 }
//             });
//         });
//     }

//     // Generate optimized URL
//     generateOptimizedUrl(originalUrl, options = {}) {
//         const { width, height, quality, crop } = options;
//         const parts = originalUrl.split('/upload/');
        
//         if (parts.length !== 2) return originalUrl;
        
//         let transformations = [];
//         if (width || height) {
//             transformations.push(`w_${width || 'auto'},h_${height || 'auto'},c_${crop || 'fill'}`);
//         }
//         if (quality) {
//             transformations.push(`q_${quality}`);
//         }
        
//         if (transformations.length > 0) {
//             return `${parts[0]}/upload/${transformations.join(',')}/${parts[1]}`;
//         }
        
//         return originalUrl;
//     }
// }

// module.exports = new CloudinaryService();

const cloudinaryConfig = require('../../config/cloudinary');

class CloudinaryService {
    constructor() {
        // Call the configure function to get the configured cloudinary instance
        this.cloudinary = cloudinaryConfig.configureCloudinary();
        this.uploadOptions = cloudinaryConfig.uploadOptions;
    }

    // Determine resource type based on mime type
    getResourceType(mimeType) {
        if (mimeType.startsWith('image/')) {
            return 'image';
        } else if (mimeType.startsWith('video/')) {
            return 'video';
        } else if (mimeType.startsWith('audio/')) {
            return 'video'; // Cloudinary treats audio as video
        } else if (mimeType.includes('pdf') || 
                   mimeType.includes('document') || 
                   mimeType.includes('text') ||
                   mimeType.includes('msword') ||
                   mimeType.includes('presentation') ||
                   mimeType.includes('spreadsheet')) {
            return 'raw'; // Documents
        } else {
            return 'auto'; // Let Cloudinary auto-detect
        }
    }

    // Get folder based on resource type
    getFolder(resourceType, collegeId = null) {
        const baseFolder = 'college_updates';
        let folder = '';
        
        // Map resource type to folder
        if (resourceType === 'image') {
            folder = 'images';
        } else if (resourceType === 'video') {
            folder = 'videos';
        } else if (resourceType === 'raw') {
            folder = 'documents';
        } else {
            folder = 'others';
        }
        
        let fullPath = `${baseFolder}/${folder}`;
        
        if (collegeId) {
            fullPath = `${fullPath}/college_${collegeId}`;
        }
        
        return fullPath;
    }

    // Upload from file path
    async uploadFromPath(filePath, options) {
        return new Promise((resolve, reject) => {
            this.cloudinary.uploader.upload(filePath, options, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    }

    // Upload file with automatic type detection
    async uploadMediaFile(file, user, collegeId = null) {
        try {
            const resourceType = this.getResourceType(file.mimetype);
            const folder = this.getFolder(resourceType, collegeId);
            
            // Base upload options
            let uploadOptions = {
                folder: folder,
                resource_type: resourceType,
                public_id: `user_${user._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                overwrite: false,
                unique_filename: true
            };

            console.log(`Uploading ${file.originalname} as ${resourceType} to folder: ${folder}`);

            // Add type-specific options
            if (resourceType === 'image') {
                uploadOptions = {
                    ...uploadOptions,
                    ...this.uploadOptions.image,
                    transformation: [
                        { width: 1200, crop: 'limit' },
                        { quality: 'auto:good' },
                        { fetch_format: 'auto' } // Auto convert to webp
                    ]
                };
            } else if (resourceType === 'video') {
                uploadOptions = {
                    ...uploadOptions,
                    ...this.uploadOptions.video,
                    eager: [
                        { width: 640, height: 360, crop: 'scale', format: 'jpg' }
                    ],
                    eager_async: true
                };
            } else if (resourceType === 'raw') {
                uploadOptions = {
                    ...uploadOptions,
                    ...this.uploadOptions.document,
                    // For documents, we don't need transformations
                };
            }

            // Upload the file
            const result = await this.uploadFromPath(file.path, uploadOptions);
            console.log(`Upload successful: ${result.secure_url}`);

            // Generate thumbnail URL
            let thumbnailUrl = result.secure_url;
            
            if (resourceType === 'image') {
                // Create thumbnail for images
                const parts = result.secure_url.split('/upload/');
                if (parts.length === 2) {
                    thumbnailUrl = `${parts[0]}/upload/w_300,h_300,c_fill/${parts[1]}`;
                }
            } else if (resourceType === 'video' && result.eager && result.eager[0]) {
                // Use the generated eager transformation as thumbnail
                thumbnailUrl = result.eager[0].secure_url;
            } else if (resourceType === 'raw') {
                // For documents, we can use a document icon or generic thumbnail
                // You could create a placeholder image for documents
                thumbnailUrl = null; // Or set to a document icon URL
            }

            return {
                success: true,
                data: {
                    url: result.secure_url,
                    public_id: result.public_id,
                    format: result.format,
                    resource_type: result.resource_type,
                    width: result.width,
                    height: result.height,
                    bytes: result.bytes,
                    duration: result.duration,
                    thumbnail_url: thumbnailUrl,
                    folder: result.folder,
                    created_at: result.created_at,
                    secure_url: result.secure_url,
                    raw: result
                }
            };

        } catch (error) {
            console.error('Cloudinary upload error:', error);
            return {
                success: false,
                error: error.message,
                details: error
            };
        }
    }

    // Upload multiple files
    async uploadMultipleFiles(files, user, collegeId = null) {
        const uploadPromises = files.map(file => 
            this.uploadMediaFile(file, user, collegeId)
        );
        
        const results = await Promise.allSettled(uploadPromises);
        
        const successful = [];
        const failed = [];
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.success) {
                successful.push({
                    file: files[index].originalname,
                    data: result.value.data
                });
            } else {
                failed.push({
                    file: files[index].originalname,
                    error: result.reason || result.value?.error || 'Unknown error'
                });
            }
        });
        
        return {
            successful,
            failed,
            total: files.length,
            successfulCount: successful.length,
            failedCount: failed.length
        };
    }

    // Delete file from Cloudinary
    async deleteFile(publicId, resourceType = 'image') {
        return new Promise((resolve, reject) => {
            this.cloudinary.uploader.destroy(publicId, {
                resource_type: resourceType
            }, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    }

    // Delete multiple files
    async deleteMultipleFiles(publicIds, resourceType = 'image') {
        const deletePromises = publicIds.map(publicId => 
            this.deleteFile(publicId, resourceType)
        );
        
        return Promise.allSettled(deletePromises);
    }

    // Generate optimized URL
    generateOptimizedUrl(originalUrl, options = {}) {
        const { width, height, quality, crop, format } = options;
        const parts = originalUrl.split('/upload/');
        
        if (parts.length !== 2) return originalUrl;
        
        let transformations = [];
        
        if (width || height) {
            transformations.push(`w_${width || 'auto'},h_${height || 'auto'},c_${crop || 'fill'}`);
        }
        
        if (quality) {
            transformations.push(`q_${quality}`);
        }
        
        if (format) {
            transformations.push(`f_${format}`);
        }
        
        if (transformations.length > 0) {
            return `${parts[0]}/upload/${transformations.join(',')}/${parts[1]}`;
        }
        
        return originalUrl;
    }

    // Generate thumbnail URL
    generateThumbnailUrl(originalUrl, size = '300x300') {
        const parts = originalUrl.split('/upload/');
        
        if (parts.length !== 2) return originalUrl;
        
        const [width, height] = size.split('x');
        return `${parts[0]}/upload/w_${width},h_${height},c_fill/${parts[1]}`;
    }

    // Check if file exists
    async fileExists(publicId, resourceType = 'image') {
        return new Promise((resolve, reject) => {
            this.cloudinary.api.resource(publicId, {
                resource_type: resourceType
            }, (error, result) => {
                if (error && error.http_code === 404) {
                    resolve(false);
                } else if (error) {
                    reject(error);
                } else {
                    resolve(true);
                }
            });
        });
    }

    // Get file info
    async getFileInfo(publicId, resourceType = 'image') {
        return new Promise((resolve, reject) => {
            this.cloudinary.api.resource(publicId, {
                resource_type: resourceType
            }, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    }
}

module.exports = new CloudinaryService();