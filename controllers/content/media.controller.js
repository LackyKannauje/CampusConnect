const Media = require('../../models/content/Media.model');
const cloudinary = require('cloudinary').v2;
const errorMiddleware  = require('../../middleware/error.middleware');

const mediaController = {
    // Upload media
    uploadMedia: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;
        const file = req.file;
        const { category = 'post', description, tags } = req.body;

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        try {
            // Upload to Cloudinary
            const uploadOptions = {
                folder: `college_updates/${user.academic.collegeId}/${category}`,
                resource_type: 'auto'
            };

            const result = await cloudinary.uploader.upload(file.path, uploadOptions);

            // Create media document
            const media = new Media({
                uploadedBy: user._id,
                collegeId: user.academic.collegeId,
                departmentId: user.academic.departmentId,
                originalName: file.originalname,
                file: {
                    url: result.secure_url,
                    type: result.resource_type,
                    size: result.bytes,
                    thumbnail: result.resource_type === 'image' ? 
                        cloudinary.url(result.public_id, {
                            width: 300,
                            height: 300,
                            crop: 'fill',
                            quality: 'auto'
                        }) : null
                },
                type: result.resource_type,
                category,
                contentInfo: {
                    title: file.originalname,
                    description: description || '',
                    tags: tags ? tags.split(',').map(t => t.trim()) : []
                },
                processing: {
                    status: 'ready',
                    progress: 100,
                    processedAt: new Date()
                },
                permissions: {
                    visibility: 'college',
                    downloadable: true,
                    shareable: true
                }
            });

            await media.save();

            res.status(201).json({
                message: 'Media uploaded successfully',
                media: {
                    id: media._id,
                    url: media.file.url,
                    thumbnail: media.file.thumbnail,
                    type: media.type,
                    size: media.file.size,
                    originalName: media.originalName
                }
            });

        } catch (error) {
            console.error('Media upload error:', error);
            res.status(500).json({ error: 'Failed to upload media' });
        }
    }),

    // Get media by ID
    getMedia: errorMiddleware.catchAsync(async (req, res) => {
        const { mediaId } = req.params;
        const user = req.user;

        const media = await Media.findById(mediaId)
            .populate('uploadedBy', 'profile.firstName profile.lastName profile.avatar');

        if (!media || !media.isActive) {
            return res.status(404).json({ error: 'Media not found' });
        }

        // Check access permissions
        if (!media.checkAccess(user)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Increment view count
        media.incrementView(user._id);
        await media.save();

        const response = {
            id: media._id,
            url: media.file.url,
            thumbnail: media.file.thumbnail,
            type: media.type,
            size: media.file.size,
            originalName: media.originalName,
            uploadedBy: {
                id: media.uploadedBy._id,
                name: media.uploadedBy.profile.fullName,
                avatar: media.uploadedBy.profile.avatar?.url
            },
            description: media.contentInfo.description,
            tags: media.contentInfo.tags,
            usage: {
                views: media.usage.views,
                downloads: media.usage.downloads
            },
            permissions: media.permissions,
            createdAt: media.createdAt
        };

        res.json(response);
    }),

    // Delete media
    deleteMedia: errorMiddleware.catchAsync(async (req, res) => {
        const { mediaId } = req.params;
        const user = req.user;

        const media = await Media.findById(mediaId);
        if (!media) {
            return res.status(404).json({ error: 'Media not found' });
        }

        // Check ownership or admin rights
        const isOwner = media.uploadedBy.equals(user._id);
        const isAdmin = ['admin', 'college_admin', 'moderator'].includes(user.academic.role);
        
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'Not authorized to delete this media' });
        }

        // Delete from Cloudinary
        if (media.file.url.includes('cloudinary')) {
            try {
                const publicId = media.file.url.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            } catch (error) {
                console.error('Cloudinary delete error:', error);
                // Continue with database deletion even if Cloudinary fails
            }
        }

        // Soft delete from database
        media.isActive = false;
        media.processing.status = 'deleted';
        await media.save();

        res.json({ message: 'Media deleted successfully' });
    }),

    // Get all media (with filters)
    getAllMedia: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.user.academic;
        const { type, category, uploadedBy } = req.query;

        let query = {
            collegeId,
            isActive: true,
            'processing.status': 'ready'
        };

        if (type) query.type = type;
        if (category) query.category = category;
        if (uploadedBy) query.uploadedBy = uploadedBy;

        const result = await Pagination.paginate(Media, query, {
            page: req.pagination.page,
            limit: req.pagination.limit,
            select: 'file.url file.thumbnail type category originalName contentInfo.description usage.views usage.downloads createdAt',
            populate: {
                path: 'uploadedBy',
                select: 'profile.firstName profile.lastName profile.avatar'
            },
            sort: { createdAt: -1 }
        });

        res.json(result);
    })
};

module.exports = mediaController;