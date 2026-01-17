const Content = require('../../models/content/Content.model');
const Media = require('../../models/content/Media.model');
const ContentModerator = require('../../services/ai/ContentModerator');
const Pagination = require('../../utils/pagination');
const errorMiddleware  = require('../../middleware/error.middleware');
const User = require('../../models/user/User.model');
const CloudinaryService = require('../../services/cloudinary/cloudinaryService');
const fs = require('fs').promises;

const contentModerator = new ContentModerator();

const postController = {
    // Get all posts
    getAllPosts: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.user.academic;
        const { type, category, departmentId } = req.query;

        let query = {
            collegeId,
            'moderation.status': 'approved',
            'visibility.isDraft': false
        };

        if (type) query.type = type;
        if (category) query.category = category;
        if (departmentId) query.departmentId = departmentId;

        const result = await Pagination.paginate(Content, query, {
            page: req.pagination.page,
            limit: req.pagination.limit,
            select: 'title excerpt type category featuredMedia media createdAt engagement.likes engagement.comments engagement.views',
            populate: [
                { path: 'authorId', select: 'profile.firstName profile.lastName profile.avatar academic.role' },
                { path: 'featuredMedia', select: 'url thumbnail' }
            ],
            sort: { createdAt: -1 }
        });

        res.json(result);
    }),

    // Get personalized feed
    getFeed: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;
        const { collegeId, departmentId } = user.academic;

        // Build feed query based on user preferences
        let query = {
            collegeId,
            'moderation.status': 'approved',
            'visibility.isDraft': false,
            $or: [
                { 'visibility.scope': 'public' },
                { 'visibility.scope': 'college' },
                { 
                    'visibility.scope': 'department',
                    departmentId: departmentId 
                },
                {
                    'visibility.scope': 'followers',
                    authorId: { $in: user.social.following }
                }
            ]
        };

        // Filter by user interests if available
        if (user.aiProfile?.detectedInterests?.length > 0) {
            const interests = user.aiProfile.detectedInterests.map(i => i.topic);
            query['ai.tags'] = { $in: interests };
        }

        const result = await Pagination.paginate(Content, query, {
            page: req.pagination.page,
            limit: req.pagination.limit,
            select: 'title excerpt type category featuredMedia media createdAt engagement.likes engagement.comments',
            populate: [
                { path: 'authorId', select: 'profile.firstName profile.lastName profile.avatar academic.role' },
                { path: 'featuredMedia', select: 'url thumbnail' }
            ],
            sort: { 'engagement.hotScore': -1 }
        });

        res.json(result);
    }),

    // Get trending posts
    getTrending: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.user.academic;
        const { timeframe = 'week' } = req.query;

        const timeframes = {
            'day': 1,
            'week': 7,
            'month': 30
        };

        const days = timeframes[timeframe] || 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const trendingPosts = await Content.getTrending(collegeId, 20, timeframe);

        res.json({
            timeframe,
            posts: trendingPosts
        });
    }),

    // Search posts
    searchPosts: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.user.academic;
        const { q: searchTerm, type, category } = req.query;

        if (!searchTerm || searchTerm.length < 2) {
            return res.status(400).json({ error: 'Search term must be at least 2 characters' });
        }

        const filters = {};
        if (type) filters.type = type;
        if (category) filters.category = category;

        const results = await Content.search(searchTerm, filters, {
            collegeId,
            limit: req.pagination.limit,
            skip: req.pagination.skip,
            sortBy: 'relevance'
        });

        res.json(results);
    }),

    // Create post
    // createPost: errorMiddleware.catchAsync(async (req, res) => {
    //     const user = req.user;
    //     const { title, content, type, category, visibility, tags } = req.body;
    //     const mediaFiles = req.files || [];
    
    //     // Check if user can post
    //     if (!user.academic.departmentId && visibility === 'department') {
    //         return res.status(400).json({ error: 'Cannot post to department without department affiliation' });
    //     }
    
    //     // Process media uploads
    //     const mediaIds = [];
    //     for (const file of mediaFiles) {
    //         // Generate a unique mediaId
    //         const timestamp = Date.now().toString(36);
    //         const random = Math.random().toString(36).substr(2, 9);
    //         const mediaId = `media_${timestamp}_${random}`;
            
    //         // Extract file extension and determine media type
    //         const fileExt = file.originalname.split('.').pop().toLowerCase();
    //         const mimeType = file.mimetype.split('/')[0];
            
    //         // Create Media document
    //         const media = new Media({
    //             mediaId,
    //             uploadedBy: user._id,
    //             collegeId: user.academic.collegeId,
    //             departmentId: user.academic.departmentId,
    //             originalName: file.originalname,
    //             file: {
    //                 url: `/uploads/${file.filename}`,
    //                 type: mimeType,
    //                 size: file.size,
    //                 mimeType: file.mimetype,
    //                 filename: file.filename,
    //                 path: file.path
    //             },
    //             type: mimeType,
    //             category: 'post',
    //             permissions: {
    //                 visibility: 'college',
    //                 downloadable: true,
    //                 shareable: true,
    //                 requiresAuth: true
    //             },
    //             processing: {
    //                 status: 'ready',
    //                 progress: 100,
    //                 processedAt: new Date()
    //             },
    //             contentInfo: {
    //                 title: file.originalname,
    //                 format: fileExt
    //             },
    //             moderation: {
    //                 status: 'approved'
    //             },
    //             isActive: true
    //         });
            
    //         await media.save();
    //         mediaIds.push(media._id.toString()); // Store as string
    //     }
    
    //     // AI Content Analysis
    //     let aiAnalysis = {};
    //     let postTags = [];
        
    //     if (content) {
    //         // Moderation
    //         const moderation = await contentModerator.moderateContent(content, {
    //             contentType: 'text',
    //             collegeId: user.academic.collegeId,
    //             userId: user._id
    //         });
    
    //         if (!moderation.safe && moderation.flagged) {
    //             return res.status(400).json({ 
    //                 error: 'Content violates community guidelines',
    //                 flags: moderation.categories 
    //             });
    //         }
    
    //         // Generate tags if not provided
    //         postTags = tags || [];
    //         if (!tags || tags.length === 0) {
    //             const tagResult = await contentModerator.generateTags(content, {
    //                 collegeId: user.academic.collegeId
    //             });
    //             postTags = tagResult.tags || [];
    //         }
    
    //         // Generate summary
    //         const summary = await contentModerator.generateSummary(content, {
    //             collegeId: user.academic.collegeId,
    //             maxLength: 150
    //         });
    
    //         aiAnalysis = {
    //             tags: postTags,
    //             summary: summary.summary,
    //             sentiment: {
    //                 label: 'neutral',
    //                 score: 0
    //             }
    //         };
    //     }
    
    //     // Generate contentId
    //     const timestamp = Date.now().toString(36);
    //     const random = Math.random().toString(36).substr(2, 9);
    //     const contentId = `post_${timestamp}_${random}`;
    
    //     // Create post WITHOUT the media array for now
    //     const post = new Content({
    //         contentId,
    //         authorId: user._id,
    //         collegeId: user.academic.collegeId,
    //         departmentId: user.academic.departmentId,
    //         title,
    //         content: { 
    //             text: content || '',
    //             wordCount: content ? content.split(/\s+/).length : 0,
    //             readingTime: content ? Math.ceil(content.split(/\s+/).length / 200) : 0
    //         },
    //         type: type || 'post',
    //         category: category || 'general',
    //         tags: postTags,
    //         // Don't include media array for now
    //         featuredMedia: mediaIds.length > 0 ? mediaIds[0] : null,
    //         visibility: {
    //             scope: visibility || 'college',
    //             isDraft: false
    //         },
    //         aiAnalysis: aiAnalysis,
    //         moderation: {
    //             status: 'approved'
    //         },
    //         isActive: true
    //     });
    
    //     await post.save();
    
    //     // Update user stats
    //     user.stats.content.posts += 1;
    //     await user.save();
    
    //     res.status(201).json({
    //         message: 'Post created successfully',
    //         post: {
    //             id: post._id,
    //             contentId: post.contentId,
    //             title: post.title,
    //             type: post.type,
    //             category: post.category,
    //             createdAt: post.createdAt,
    //             mediaCount: mediaIds.length
    //         }
    //     });
    // }),

    // createPost: errorMiddleware.catchAsync(async (req, res) => {
    //     const user = req.user;
    //     const { title, content, type, category, visibility, tags } = req.body;
    //     const mediaFiles = req.files || [];
    
    //     // Check if user can post
    //     if (!user.academic.departmentId && visibility === 'department') {
    //         return res.status(400).json({ error: 'Cannot post to department without department affiliation' });
    //     }
    
    //     // Process media uploads
    //     const mediaIds = [];
    //     for (const file of mediaFiles) {
    //         // Generate a unique mediaId
    //         const timestamp = Date.now().toString(36);
    //         const random = Math.random().toString(36).substr(2, 9);
    //         const mediaId = `media_${timestamp}_${random}`;
            
    //         // Extract file extension and determine media type
    //         const fileExt = file.originalname.split('.').pop().toLowerCase();
    //         const mimeType = file.mimetype.split('/')[0];
            
    //         // Create Media document
    //         const media = new Media({
    //             mediaId,
    //             uploadedBy: user._id,
    //             collegeId: user.academic.collegeId,
    //             departmentId: user.academic.departmentId,
    //             originalName: file.originalname,
    //             file: {
    //                 url: `/uploads/${file.filename}`,
    //                 type: mimeType,
    //                 size: file.size,
    //                 mimeType: file.mimetype,
    //                 filename: file.filename,
    //                 path: file.path
    //             },
    //             type: mimeType,
    //             category: 'post',
    //             permissions: {
    //                 visibility: 'college',
    //                 downloadable: true,
    //                 shareable: true,
    //                 requiresAuth: true
    //             },
    //             processing: {
    //                 status: 'ready',
    //                 progress: 100,
    //                 processedAt: new Date()
    //             },
    //             contentInfo: {
    //                 title: file.originalname,
    //                 format: fileExt
    //             },
    //             moderation: {
    //                 status: 'approved'
    //             },
    //             isActive: true
    //         });
            
    //         await media.save();
    //         mediaArray.push({
    //             mediaId: media._id, // ObjectId reference
    //             type: mimeType,
    //             url: `/uploads/${file.filename}`,
    //             thumbnail: `/uploads/thumbnails/${file.filename}`, // Adjust as needed
    //             caption: '', // You can add caption from req.body if available
    //             order: i // Maintain upload order
    //         }); // Store as string
    //     }
    
    //     // AI Content Analysis
    //     let aiAnalysis = {};
    //     let postTags = [];
        
    //     if (content) {
    //         // Moderation
    //         const moderation = await contentModerator.moderateContent(content, {
    //             contentType: 'text',
    //             collegeId: user.academic.collegeId,
    //             userId: user._id
    //         });
    
    //         if (!moderation.safe && moderation.flagged) {
    //             return res.status(400).json({ 
    //                 error: 'Content violates community guidelines',
    //                 flags: moderation.categories 
    //             });
    //         }
    
    //         // Generate tags if not provided
    //         postTags = tags || [];
    //         if (!tags || tags.length === 0) {
    //             const tagResult = await contentModerator.generateTags(content, {
    //                 collegeId: user.academic.collegeId
    //             });
    //             postTags = tagResult.tags || [];
    //         }
    
    //         // Generate summary
    //         const summary = await contentModerator.generateSummary(content, {
    //             collegeId: user.academic.collegeId,
    //             maxLength: 150
    //         });
    
    //         aiAnalysis = {
    //             tags: postTags,
    //             summary: summary.summary,
    //             sentiment: {
    //                 label: 'neutral',
    //                 score: 0
    //             }
    //         };
    //     }
    
    //     // Generate contentId
    //     const timestamp = Date.now().toString(36);
    //     const random = Math.random().toString(36).substr(2, 9);
    //     const contentId = `post_${timestamp}_${random}`;
    
    //     // Create post WITH media array
    //     const post = new Content({
    //         contentId,
    //         authorId: user._id,
    //         collegeId: user.academic.collegeId,
    //         departmentId: user.academic.departmentId,
    //         title,
    //         content: { 
    //             text: content || '',
    //             wordCount: content ? content.split(/\s+/).length : 0,
    //             readingTime: content ? Math.ceil(content.split(/\s+/).length / 200) : 0
    //         },
    //         type: type || 'post',
    //         category: category || 'general',
    //         tags: postTags,
    //         // ✅ ADD THIS: Include the media array
    //         media: mediaIds.length > 0 ? mediaIds : [],
    //         featuredMedia: mediaIds.length > 0 ? mediaIds[0] : null,
    //         visibility: {
    //             scope: visibility || 'college',
    //             isDraft: false
    //         },
    //         aiAnalysis: aiAnalysis,
    //         moderation: {
    //             status: 'approved'
    //         },
    //         isActive: true
    //     });
    
    //     await post.save();
    
    //     // Update user stats
    //     user.stats.content.posts += 1;
    //     await user.save();
    
    //     // Populate media details in response
    //     const populatedPost = await Content.findById(post._id)
    //         .populate({
    //             path: 'media',
    //             select: 'mediaId file.url file.type contentInfo.title'
    //         })
    //         .populate({
    //             path: 'featuredMedia',
    //             select: 'mediaId file.url file.type contentInfo.title'
    //         });
    
    //     res.status(201).json({
    //         message: 'Post created successfully',
    //         post: {
    //             id: post._id,
    //             contentId: post.contentId,
    //             title: post.title,
    //             type: post.type,
    //             category: post.category,
    //             createdAt: post.createdAt,
    //             mediaCount: mediaIds.length,
    //             media: populatedPost.media || [],
    //             featuredMedia: populatedPost.featuredMedia
    //         }
    //     });
    // }),
    // createPost: errorMiddleware.catchAsync(async (req, res) => {
    //     const user = req.user;
    //     const { 
    //         title, 
    //         content, 
    //         type = 'post', 
    //         category = 'general', 
    //         visibility = 'college', 
    //         tags = [],
    //         mediaCaptions = [],
    //         subtitle,
    //         excerpt 
    //     } = req.body;
        
    //     const mediaFiles = req.files || [];
    
    //     // ========== 1. BASIC VALIDATION ==========
    //     if (!title || !title.trim()) {
    //         return res.status(400).json({ 
    //             success: false,
    //             error: 'Title is required' 
    //         });
    //     }
    
    //     if (visibility === 'department' && !user.academic?.departmentId) {
    //         return res.status(400).json({ 
    //             success: false,
    //             error: 'Cannot post to department without department affiliation' 
    //         });
    //     }
    
    //     // ========== 2. SIMPLIFIED MEDIA PROCESSING ==========
    //     const mediaItems = [];
    //     const savedMediaIds = [];
    
    //     try {
    //         // Process each media file
    //         for (let i = 0; i < mediaFiles.length; i++) {
    //             const file = mediaFiles[i];
                
    //             // Generate unique media ID
    //             const timestamp = Date.now().toString(36);
    //             const random = Math.random().toString(36).substr(2, 9);
    //             const mediaId = `media_${timestamp}_${random}`;
                
    //             // Determine media type
    //             const mimeType = file.mimetype.split('/')[0];
    //             const fileExt = file.originalname.split('.').pop().toLowerCase();
                
    //             // Get caption (if any)
    //             let caption = '';
    //             if (mediaCaptions && Array.isArray(mediaCaptions)) {
    //                 caption = mediaCaptions[i] || '';
    //             } else if (mediaCaptions && typeof mediaCaptions === 'string') {
    //                 try {
    //                     const parsed = JSON.parse(mediaCaptions);
    //                     if (Array.isArray(parsed)) {
    //                         caption = parsed[i] || '';
    //                     }
    //                 } catch (e) {
    //                     // Ignore parsing errors
    //                 }
    //             }
    
    //             // Create a SIMPLE Media document (only required fields)
    //             const mediaDoc = {
    //                 mediaId,
    //                 uploadedBy: user._id,
    //                 collegeId: user.academic?.collegeId,
    //                 departmentId: user.academic?.departmentId,
    //                 originalName: file.originalname,
    //                 file: {
    //                     url: `/uploads/${file.filename}`,
    //                     type: mimeType,
    //                     size: file.size,
    //                     mimeType: file.mimetype,
    //                     filename: file.filename,
    //                     path: file.path
    //                 },
    //                 type: mimeType,
    //                 category: 'post',
    //                 permissions: {
    //                     visibility: 'college',
    //                     downloadable: true,
    //                     shareable: true,
    //                     requiresAuth: true
    //                 },
    //                 processing: {
    //                     status: 'ready',
    //                     progress: 100,
    //                     processedAt: new Date()
    //                 },
    //                 contentInfo: {
    //                     title: file.originalname,
    //                     format: fileExt
    //                 },
    //                 moderation: {
    //                     status: 'approved'
    //                 },
    //                 isActive: true
    //             };
    
    //             const media = new Media(mediaDoc);
    //             const savedMedia = await media.save();
    //             savedMediaIds.push(savedMedia._id);
    
    //             // Create the EXACT structure that matches your schema
    //             const mediaItem = {
    //                 mediaId: savedMedia._id, // Must be ObjectId
    //                 type: mimeType, // Must be string
    //                 url: `/uploads/${file.filename}`, // Must be string
    //                 thumbnail: `/uploads/${file.filename}`, // Optional string
    //                 caption: caption, // Optional string
    //                 order: i // Must be number
    //             };
    
    //             // DEBUG: Log the media item structure
    //             console.log('Created media item:', JSON.stringify(mediaItem, null, 2));
                
    //             mediaItems.push(mediaItem);
    //         }
    //     } catch (mediaError) {
    //         console.error('Media processing error:', mediaError);
            
    //         // Clean up any saved media
    //         for (const mediaId of savedMediaIds) {
    //             try {
    //                 await Media.deleteOne({ _id: mediaId });
    //             } catch (deleteError) {
    //                 console.error('Cleanup error:', deleteError);
    //             }
    //         }
            
    //         return res.status(500).json({
    //             success: false,
    //             error: 'Failed to process media files'
    //         });
    //     }
    
    //     // ========== 3. CONTENT PROCESSING ==========
    //     let postTags = [];
    //     let aiAnalysis = {};
        
    //     if (content && content.trim()) {
    //         try {
    //             // Convert tags to array
    //             if (tags && Array.isArray(tags)) {
    //                 postTags = tags.map(tag => tag.trim().toLowerCase());
    //             } else if (tags && typeof tags === 'string') {
    //                 postTags = tags.split(',').map(tag => tag.trim().toLowerCase());
    //             }
                
    //             // Content moderation
    //             const moderation = await contentModerator.moderateContent(content, {
    //                 contentType: 'text',
    //                 collegeId: user.academic?.collegeId,
    //                 userId: user._id
    //             });
    
    //             if (!moderation.safe && moderation.flagged) {
    //                 // Clean up media
    //                 for (const mediaId of savedMediaIds) {
    //                     await Media.deleteOne({ _id: mediaId });
    //                 }
                    
    //                 return res.status(400).json({ 
    //                     success: false,
    //                     error: 'Content violates community guidelines',
    //                     flags: moderation.categories 
    //                 });
    //             }
    
    //             // Generate AI analysis if available
    //             if (contentModerator.generateSummary) {
    //                 try {
    //                     const summary = await contentModerator.generateSummary(content, {
    //                         collegeId: user.academic?.collegeId,
    //                         maxLength: 150
    //                     });
                        
    //                     aiAnalysis = {
    //                         summary: summary.summary || '',
    //                         tags: postTags,
    //                         sentiment: { label: 'neutral', score: 0.5 }
    //                     };
    //                 } catch (aiError) {
    //                     console.error('AI analysis error:', aiError);
    //                 }
    //             }
    //         } catch (contentError) {
    //             console.error('Content processing error:', contentError);
    //             // Continue without AI features
    //         }
    //     }
    
    //     // ========== 4. CREATE THE POST ==========
    //     try {
    //         // Generate content ID
    //         const timestamp = Date.now().toString(36);
    //         const random = Math.random().toString(36).substr(2, 9);
    //         const contentId = `post_${timestamp}_${random}`;
    
    //         // Calculate word count
    //         const wordCount = content ? content.split(/\s+/).filter(word => word.length > 0).length : 0;
    //         const readingTime = Math.ceil(wordCount / 200);
    
    //         // Create the post document - SIMPLIFIED
    //         const postData = {
    //             contentId,
    //             authorId: user._id,
    //             collegeId: user.academic?.collegeId,
    //             departmentId: user.academic?.departmentId,
    //             title: title.trim(),
    //             subtitle: subtitle ? subtitle.trim() : undefined,
    //             excerpt: excerpt ? excerpt.trim() : undefined,
    //             content: {
    //                 text: content ? content.trim() : '',
    //                 wordCount,
    //                 readingTime,
    //                 language: 'en'
    //             },
    //             type: type,
    //             category: category,
    //             tags: postTags,
    //             // CRITICAL: Ensure media is an array of proper objects
    //             media: mediaItems,
    //             featuredMedia: mediaItems.length > 0 ? mediaItems[0].mediaId : null,
    //             visibility: {
    //                 scope: visibility,
    //                 isDraft: false,
    //                 publishedAt: new Date()
    //             },
    //             moderation: {
    //                 status: 'approved'
    //             },
    //             isActive: true
    //         };
    
    //         // DEBUG: Check what we're about to save
    //         console.log('Post data before save:', {
    //             mediaCount: postData.media.length,
    //             firstMediaItem: postData.media[0],
    //             mediaFieldType: typeof postData.media,
    //             isArray: Array.isArray(postData.media)
    //         });
    
    //         // Save the post
    //         const post = new Content(postData);
    //         await post.save();
    
    //         // ========== 5. UPDATE USER STATS ==========
    //         try {
    //             if (user.stats?.content) {
    //                 user.stats.content.posts = (user.stats.content.posts || 0) + 1;
    //                 await user.save();
    //             }
    //         } catch (userError) {
    //             console.error('User stats update error:', userError);
    //         }
    
    //         // ========== 6. PREPARE RESPONSE ==========
    //         // Get populated post
    //         const populatedPost = await Content.findById(post._id)
    //             .populate({
    //                 path: 'media.mediaId',
    //                 select: 'mediaId file.url file.type contentInfo.title'
    //             })
    //             .populate({
    //                 path: 'featuredMedia',
    //                 select: 'mediaId file.url file.type '
    //             })
    //             .populate({
    //                 path: 'authorId',
    //                 select: 'profile.firstName profile.lastName profile.avatar.username'
    //             })
    //             .lean();
    
    //         // Format media for response
    //         const formattedMedia = populatedPost.media ? populatedPost.media.map(item => ({
    //             id: item.mediaId?._id,
    //             mediaId: item.mediaId?.mediaId,
    //             type: item.type,
    //             url: item.url,
    //             thumbnail: item.thumbnail,
    //             caption: item.caption,
    //             order: item.order,
    //             fileUrl: item.mediaId?.file?.url,
    //             title: item.mediaId?.contentInfo?.title
    //         })) : [];
    
    //         // Send success response
    //         return res.status(201).json({
    //             success: true,
    //             message: 'Post created successfully',
    //             data: {
    //                 id: populatedPost._id,
    //                 contentId: populatedPost.contentId,
    //                 title: populatedPost.title,
    //                 content: populatedPost.content,
    //                 type: populatedPost.type,
    //                 category: populatedPost.category,
    //                 tags: populatedPost.tags,
    //                 media: formattedMedia,
    //                 mediaCount: formattedMedia.length,
    //                 featuredMedia: populatedPost.featuredMedia ? {
    //                     id: populatedPost.featuredMedia._id,
    //                     mediaId: populatedPost.featuredMedia.mediaId,
    //                     url: populatedPost.featuredMedia.file?.url,
    //                     type: populatedPost.featuredMedia.file?.type
    //                 } : null,
    //                 author: {
    //                     id: populatedPost.authorId?._id,
    //                     name: `${populatedPost.authorId?.profile?.firstName || ''} ${populatedPost.authorId?.profile?.lastName || ''}`.trim(),
    //                     avatar: populatedPost.authorId?.profile?.avatar?.username
    //                 },
    //                 visibility: populatedPost.visibility,
    //                 createdAt: populatedPost.createdAt,
    //                 updatedAt: populatedPost.updatedAt
    //             }
    //         });
    
    //     } catch (postError) {
    //         console.error('Post creation error:', postError);
            
    //         // Clean up media on error
    //         for (const mediaId of savedMediaIds) {
    //             try {
    //                 await Media.deleteOne({ _id: mediaId });
    //             } catch (deleteError) {
    //                 console.error('Media cleanup error:', deleteError);
    //             }
    //         }
    
    //         // Handle specific errors
    //         if (postError.name === 'ValidationError') {
    //             const errors = Object.values(postError.errors).map(err => ({
    //                 field: err.path,
    //                 message: err.message,
    //                 value: err.value
    //             }));
                
    //             return res.status(400).json({
    //                 success: false,
    //                 error: 'Validation failed',
    //                 details: errors
    //             });
    //         }
    
    //         return res.status(500).json({
    //             success: false,
    //             error: 'Failed to create post',
    //             message: process.env.NODE_ENV === 'development' ? postError.message : 'Internal server error'
    //         });
    //     }
    // }),



createPost: errorMiddleware.catchAsync(async (req, res) => {
    const user = req.user;
    const { 
        title, 
        content, 
        type = 'post', 
        category = 'general', 
        visibility = 'college', 
        tags = [],
        mediaCaptions = [],
        subtitle,
        excerpt 
    } = req.body;
    
    const mediaFiles = req.files || [];

    // ========== 1. BASIC VALIDATION ==========
    if (!title || !title.trim()) {
        return res.status(400).json({ 
            success: false,
            error: 'Title is required' 
        });
    }

    if (visibility === 'department' && !user.academic?.departmentId) {
        return res.status(400).json({ 
            success: false,
            error: 'Cannot post to department without department affiliation' 
        });
    }

    // ========== 2. CLOUDINARY MEDIA UPLOAD ==========
    const mediaItems = [];
    const savedMediaIds = [];
    const uploadedToCloudinary = []; // Track files uploaded to Cloudinary

    try {
        // Process each media file
        for (let i = 0; i < mediaFiles.length; i++) {
            const file = mediaFiles[i];
            
            // Get caption (if any)
            let caption = '';
            if (mediaCaptions && Array.isArray(mediaCaptions)) {
                caption = mediaCaptions[i] || '';
            } else if (mediaCaptions && typeof mediaCaptions === 'string') {
                try {
                    const parsed = JSON.parse(mediaCaptions);
                    if (Array.isArray(parsed)) {
                        caption = parsed[i] || '';
                    }
                } catch (e) {
                    // Ignore parsing errors
                }
            }

            // Upload to Cloudinary
            console.log(`Uploading ${file.originalname} to Cloudinary...`);
            const cloudinaryResult = await CloudinaryService.uploadMediaFile(
                file, 
                user, 
                user.academic?.collegeId?.toString()
            );

            if (!cloudinaryResult.success) {
                throw new Error(`Failed to upload ${file.originalname}: ${cloudinaryResult.error}`);
            }

            const cloudinaryData = cloudinaryResult.data;
            uploadedToCloudinary.push({
                publicId: cloudinaryData.public_id,
                resourceType: cloudinaryData.resource_type,
                filePath: file.path
            });

            // Generate unique media ID
            const timestamp = Date.now().toString(36);
            const random = Math.random().toString(36).substr(2, 9);
            const mediaId = `media_${timestamp}_${random}`;
            
            // Create Media document with Cloudinary URLs
            const mediaDoc = {
                mediaId,
                uploadedBy: user._id,
                collegeId: user.academic?.collegeId,
                departmentId: user.academic?.departmentId,
                originalName: file.originalname,
                file: {
                    url: cloudinaryData.url,
                    type: cloudinaryData.resource_type,
                    size: cloudinaryData.bytes,
                    mimeType: file.mimetype,
                    filename: file.filename,
                    path: file.path,
                    thumbnail: cloudinaryData.thumbnail_url,
                    cloudinary: {
                        public_id: cloudinaryData.public_id,
                        resource_type: cloudinaryData.resource_type,
                        format: cloudinaryData.format,
                        width: cloudinaryData.width,
                        height: cloudinaryData.height,
                        duration: cloudinaryData.duration,
                        raw_response: cloudinaryData.raw
                    }
                },
                type: cloudinaryData.resource_type,
                category: 'post',
                permissions: {
                    visibility: 'college',
                    downloadable: true,
                    shareable: true,
                    requiresAuth: true
                },
                processing: {
                    status: 'ready',
                    progress: 100,
                    processedAt: new Date(),
                    transformations: cloudinaryData.resource_type === 'image' ? [{
                        type: 'thumbnail',
                        url: cloudinaryData.thumbnail_url,
                        size: cloudinaryData.bytes,
                        createdAt: new Date()
                    }] : []
                },
                contentInfo: {
                    title: file.originalname,
                    format: cloudinaryData.format,
                    resolution: cloudinaryData.width && cloudinaryData.height 
                        ? `${cloudinaryData.width}x${cloudinaryData.height}` 
                        : null,
                    duration: cloudinaryData.duration,
                    quality: 'high'
                },
                storage: {
                    provider: 'cloudinary',
                    bucket: 'college_updates',
                    region: 'auto',
                    path: cloudinaryData.public_id,
                    urls: {
                        raw: cloudinaryData.url,
                        optimized: CloudinaryService.generateOptimizedUrl(cloudinaryData.url, { 
                            width: 800, 
                            quality: 80 
                        }),
                        thumbnail: cloudinaryData.thumbnail_url,
                        preview: cloudinaryData.thumbnail_url
                    }
                },
                moderation: {
                    status: 'approved'
                },
                isActive: true
            };

            const media = new Media(mediaDoc);
            const savedMedia = await media.save();
            savedMediaIds.push(savedMedia._id);

            // Create media item for post
            const mediaItem = {
                mediaId: savedMedia._id,
                type: cloudinaryData.resource_type,
                url: cloudinaryData.url,
                thumbnail: cloudinaryData.thumbnail_url,
                caption: caption,
                order: i
            };

            console.log(`Successfully uploaded: ${file.originalname} -> ${cloudinaryData.url}`);
            mediaItems.push(mediaItem);

            // Clean up local file after successful Cloudinary upload
            try {
                await fs.unlink(file.path);
                console.log(`Cleaned up local file: ${file.path}`);
            } catch (cleanupError) {
                console.error(`Failed to clean up local file ${file.path}:`, cleanupError);
            }
        }
    } catch (mediaError) {
        console.error('Media processing error:', mediaError);
        
        // Clean up: Delete from Cloudinary if uploaded
        for (const cloudinaryFile of uploadedToCloudinary) {
            try {
                await CloudinaryService.deleteFile(
                    cloudinaryFile.publicId, 
                    cloudinaryFile.resourceType
                );
                console.log(`Cleaned up Cloudinary file: ${cloudinaryFile.publicId}`);
            } catch (deleteError) {
                console.error(`Failed to clean up Cloudinary file ${cloudinaryFile.publicId}:`, deleteError);
            }
        }
        
        // Clean up: Delete any saved media documents
        for (const mediaId of savedMediaIds) {
            try {
                await Media.deleteOne({ _id: mediaId });
            } catch (deleteError) {
                console.error('Media document cleanup error:', deleteError);
            }
        }
        
        return res.status(500).json({
            success: false,
            error: 'Failed to process media files',
            details: process.env.NODE_ENV === 'development' ? mediaError.message : undefined
        });
    }

    // ========== 3. CONTENT PROCESSING ==========
    let postTags = [];
    let aiAnalysis = {};
    
    if (content && content.trim()) {
        try {
            // Convert tags to array
            if (tags && Array.isArray(tags)) {
                postTags = tags.map(tag => tag.trim().toLowerCase());
            } else if (tags && typeof tags === 'string') {
                postTags = tags.split(',').map(tag => tag.trim().toLowerCase());
            }
            
            // Content moderation
            const moderation = await contentModerator.moderateContent(content, {
                contentType: 'text',
                collegeId: user.academic?.collegeId,
                userId: user._id
            });

            if (!moderation.safe && moderation.flagged) {
                // Clean up all uploaded media
                for (const cloudinaryFile of uploadedToCloudinary) {
                    try {
                        await CloudinaryService.deleteFile(
                            cloudinaryFile.publicId, 
                            cloudinaryFile.resourceType
                        );
                    } catch (deleteError) {
                        console.error('Cloudinary cleanup error:', deleteError);
                    }
                }
                
                // Clean up media documents
                for (const mediaId of savedMediaIds) {
                    try {
                        await Media.deleteOne({ _id: mediaId });
                    } catch (deleteError) {
                        console.error('Media document cleanup error:', deleteError);
                    }
                }
                
                return res.status(400).json({ 
                    success: false,
                    error: 'Content violates community guidelines',
                    flags: moderation.categories 
                });
            }

            // Generate AI analysis if available
            if (contentModerator.generateSummary) {
                try {
                    const summary = await contentModerator.generateSummary(content, {
                        collegeId: user.academic?.collegeId,
                        maxLength: 150
                    });
                    
                    aiAnalysis = {
                        summary: summary.summary || '',
                        tags: postTags,
                        sentiment: { label: 'neutral', score: 0.5 }
                    };
                } catch (aiError) {
                    console.error('AI analysis error:', aiError);
                }
            }
        } catch (contentError) {
            console.error('Content processing error:', contentError);
            // Continue without AI features
        }
    }

    // ========== 4. CREATE THE POST ==========
    try {
        // Generate content ID
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        const contentId = `post_${timestamp}_${random}`;

        // Calculate word count
        const wordCount = content ? content.split(/\s+/).filter(word => word.length > 0).length : 0;
        const readingTime = Math.ceil(wordCount / 200);

        // Create the post document
        const postData = {
            contentId,
            authorId: user._id,
            collegeId: user.academic?.collegeId,
            departmentId: user.academic?.departmentId,
            title: title.trim(),
            subtitle: subtitle ? subtitle.trim() : undefined,
            excerpt: excerpt ? excerpt.trim() : undefined,
            content: {
                text: content ? content.trim() : '',
                wordCount,
                readingTime,
                language: 'en'
            },
            type: type,
            category: category,
            tags: postTags,
            media: mediaItems,
            featuredMedia: mediaItems.length > 0 ? mediaItems[0].mediaId : null,
            visibility: {
                scope: visibility,
                isDraft: false,
                publishedAt: new Date()
            },
            moderation: {
                status: 'approved'
            },
            isActive: true
        };

        // Save the post
        const post = new Content(postData);
        await post.save();

        // ========== 5. UPDATE USER STATS ==========
        try {
            if (user.stats?.content) {
                user.stats.content.posts = (user.stats.content.posts || 0) + 1;
                user.stats.content.totalMedia = (user.stats.content.totalMedia || 0) + mediaFiles.length;
                await user.save();
            }
        } catch (userError) {
            console.error('User stats update error:', userError);
        }

        // ========== 6. PREPARE RESPONSE ==========
        // Get populated post
        const populatedPost = await Content.findById(post._id)
            .populate({
                path: 'media.mediaId',
                select: 'mediaId file.url file.thumbnail file.type file.cloudinary contentInfo.title contentInfo.format contentInfo.resolution'
            })
            .populate({
                path: 'featuredMedia',
                select: 'mediaId file.url file.thumbnail file.type file.cloudinary'
            })
            .populate({
                path: 'authorId',
                select: 'profile.firstName profile.lastName profile.avatar.username'
            })
            .lean();

        // Format media for response
        const formattedMedia = populatedPost.media ? populatedPost.media.map(item => ({
            id: item.mediaId?._id,
            mediaId: item.mediaId?.mediaId,
            type: item.type,
            url: item.url,
            thumbnail: item.thumbnail,
            caption: item.caption,
            order: item.order,
            cloudinary: item.mediaId?.file?.cloudinary,
            title: item.mediaId?.contentInfo?.title,
            format: item.mediaId?.contentInfo?.format,
            resolution: item.mediaId?.contentInfo?.resolution,
            size: item.mediaId?.file?.size
        })) : [];

        // Send success response
        return res.status(201).json({
            success: true,
            message: 'Post created successfully with Cloudinary upload',
            data: {
                id: populatedPost._id,
                contentId: populatedPost.contentId,
                title: populatedPost.title,
                content: populatedPost.content,
                type: populatedPost.type,
                category: populatedPost.category,
                tags: populatedPost.tags,
                media: formattedMedia,
                mediaCount: formattedMedia.length,
                featuredMedia: populatedPost.featuredMedia ? {
                    id: populatedPost.featuredMedia._id,
                    mediaId: populatedPost.featuredMedia.mediaId,
                    url: populatedPost.featuredMedia.file?.url,
                    thumbnail: populatedPost.featuredMedia.file?.thumbnail,
                    type: populatedPost.featuredMedia.file?.type,
                    cloudinary: populatedPost.featuredMedia.file?.cloudinary
                } : null,
                author: {
                    id: populatedPost.authorId?._id,
                    name: `${populatedPost.authorId?.profile?.firstName || ''} ${populatedPost.authorId?.profile?.lastName || ''}`.trim(),
                    avatar: populatedPost.authorId?.profile?.avatar?.username
                },
                visibility: populatedPost.visibility,
                createdAt: populatedPost.createdAt,
                updatedAt: populatedPost.updatedAt
            }
        });

    } catch (postError) {
        console.error('Post creation error:', postError);
        
        // Clean up everything on error
        // 1. Delete from Cloudinary
        for (const cloudinaryFile of uploadedToCloudinary) {
            try {
                await CloudinaryService.deleteFile(
                    cloudinaryFile.publicId, 
                    cloudinaryFile.resourceType
                );
                console.log(`Cleaned up Cloudinary file on error: ${cloudinaryFile.publicId}`);
            } catch (deleteError) {
                console.error(`Failed to clean up Cloudinary file:`, deleteError);
            }
        }
        
        // 2. Delete media documents
        for (const mediaId of savedMediaIds) {
            try {
                await Media.deleteOne({ _id: mediaId });
            } catch (deleteError) {
                console.error('Media document cleanup error:', deleteError);
            }
        }

        // Handle specific errors
        if (postError.name === 'ValidationError') {
            const errors = Object.values(postError.errors).map(err => ({
                field: err.path,
                message: err.message,
                value: err.value
            }));
            
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Failed to create post',
            message: process.env.NODE_ENV === 'development' ? postError.message : 'Internal server error'
        });
    }
}),

    // Get post by ID
    getPostById: errorMiddleware.catchAsync(async (req, res) => {
        const { postId } = req.params;
        const user = req.user;

        const post = await Content.findById(postId)
            .populate('authorId', 'profile.firstName profile.lastName profile.avatar academic.role')
            .populate('featuredMedia', 'url thumbnail')
            .populate('media.mediaId', 'url thumbnail type');

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check if user can view this post
        if (!post.canUserAccess(user)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Increment view count
        post.incrementView(user._id);
        await post.save();

        // Check if user has liked/saved the post
        const hasUserId = (item, userId) =>
            item &&
            item.userId &&
            typeof item.userId.equals === "function" &&
            item.userId.equals(userId);
          
          const userLiked =
            !!(user?._id) &&
            Array.isArray(post.engagement.likes) &&
            post.engagement.likes.some(like => hasUserId(like, user._id));
          
          const userSaved =
            !!(user?._id) &&
            Array.isArray(post.engagement.saves) &&
            post.engagement.saves.some(save => hasUserId(save, user._id));
          console.log("media:");
        console.log(post.media);;
        const response = {
            id: post._id,
            title: post.title,
            content: post.content.text,
            type: post.type,
            category: post.category,
            tags: post.tags,
            author: {
                id: post.authorId._id,
                name: post.authorId.profile.fullName,
                avatar: post.authorId.profile.avatar?.url,
                role: post.authorId.academic.role
            },
            media: post.media.map(m => ({
                id: m.mediaId?._id,
                url: m.mediaId?.url,
                type: m.mediaId?.type,
                thumbnail: m.mediaId?.thumbnail
            })),
            featuredMedia: post.featuredMedia ? {
                id: post.featuredMedia._id,
                url: post.featuredMedia.url,
                thumbnail: post.featuredMedia.thumbnail
            } : null,
            engagement: {
                likes: post.engagement.likes.length,
                comments: post.engagement.comments.length,
                views: post.engagement.views,
                shares: post.engagement.shares,
                userLiked,
                userSaved
            },
            createdAt: post.createdAt,
            updatedAt: post.updatedAt
        };

        res.json(response);
    }),

    // Update post
    updatePost: errorMiddleware.catchAsync(async (req, res) => {
        const { postId } = req.params;
        const user = req.user;
        const updates = req.body;

        const post = await Content.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check ownership
        if (!post.authorId.equals(user._id) && user.academic.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to update this post' });
        }

        // Update fields
        if (updates.title) post.title = updates.title;
        if (updates.content) post.content.text = updates.content;
        if (updates.category) post.category = updates.category;
        if (updates.tags) post.tags = updates.tags;
        if (updates.visibility) post.visibility.scope = updates.visibility;

        post.updatedAt = new Date();
        await post.save();

        res.json({
            message: 'Post updated successfully',
            post: {
                id: post._id,
                title: post.title,
                updatedAt: post.updatedAt
            }
        });
    }),

    // Delete post
    deletePost: errorMiddleware.catchAsync(async (req, res) => {
        const { postId } = req.params;
        const user = req.user;

        const post = await Content.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check permissions
        const isOwner = post.authorId.equals(user._id);
        const isAdmin = ['admin', 'moderator', 'college_admin'].includes(user.academic.role);
        
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'Not authorized to delete this post' });
        }

        // Soft delete
        post.isActive = false;
        post.moderation.status = 'deleted';
        await post.save();

        // Update user stats
        if (isOwner) {
            const author = await User.findById(post.authorId);
            if (author) {
                author.stats.content.posts = Math.max(0, author.stats.content.posts - 1);
                await author.save();
            }
        }

        res.json({ message: 'Post deleted successfully' });
    }),

    // Like post
    likePost: errorMiddleware.catchAsync(async (req, res) => {
        const { postId } = req.params;
        const user = req.user;

        const post = await Content.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const liked = post.addLike(user._id);
        await post.save();

        if (liked) {
            // Update user stats
            user.stats.content.likesGiven += 1;
            await user.save();

            // Update author stats
            const author = await User.findById(post.authorId);
            if (author) {
                author.stats.content.likesReceived += 1;
                await author.save();
            }

            // TODO: Send notification to author
        }

        res.json({
            liked: true,
            likes: post.engagement.likes.length
        });
    }),

    // Unlike post
    unlikePost: errorMiddleware.catchAsync(async (req, res) => {
        const { postId } = req.params;
        const user = req.user;

        const post = await Content.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const unliked = post.removeLike(user._id);
        await post.save();

        if (unliked) {
            // Update user stats
            user.stats.content.likesGiven = Math.max(0, user.stats.content.likesGiven - 1);
            await user.save();

            // Update author stats
            const author = await User.findById(post.authorId);
            if (author) {
                author.stats.content.likesReceived = Math.max(0, author.stats.content.likesReceived - 1);
                await author.save();
            }
        }

        res.json({
            liked: false,
            likes: post.engagement.likes.length
        });
    }),

    // Save post
    savePost: errorMiddleware.catchAsync(async (req, res) => {
        const { postId } = req.params;
        const user = req.user;

        const post = await Content.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check if already saved
        const alreadySaved = post.engagement.saves.some(save => 
            save.userId.equals(user._id)
        );

        if (!alreadySaved) {
            post.engagement.saves.push({
                userId: user._id,
                savedAt: new Date()
            });
            await post.save();
        }

        res.json({ saved: true });
    }),

    // Unsave post
    unsavePost: errorMiddleware.catchAsync(async (req, res) => {
        const { postId } = req.params;
        const user = req.user;

        const post = await Content.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        post.engagement.saves = post.engagement.saves.filter(save => 
            !save.userId.equals(user._id)
        );
        await post.save();

        res.json({ saved: false });
    }),

    // Share post
    sharePost: errorMiddleware.catchAsync(async (req, res) => {
        const { postId } = req.params;
        const user = req.user;

        const post = await Content.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        post.engagement.shares += 1;
        await post.save();

        // Update user stats
        user.stats.content.shares += 1;
        await user.save();

        res.json({
            shared: true,
            shares: post.engagement.shares
        });
    }),

    // Report post
    reportPost: errorMiddleware.catchAsync(async (req, res) => {
        const { postId } = req.params;
        const { reason } = req.body;
        const user = req.user;

        const post = await Content.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Add report flag
        post.moderation.flags.push({
            type: 'user_report',
            flaggedBy: user._id,
            flaggedAt: new Date(),
            reason: reason || 'User reported',
            aiConfidence: 0.8
        });

        post.moderation.requiresManualReview = true;
        await post.save();

        res.json({ message: 'Post reported successfully' });
    }),

    // Get moderation queue
    getModerationQueue: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.user.academic;

        const queue = await Content.find({
            collegeId,
            'moderation.status': 'pending',
            'moderation.requiresManualReview': true
        })
        .select('title type category createdAt moderation.flags')
        .populate('authorId', 'profile.firstName profile.lastName academic.role')
        .sort({ createdAt: 1 })
        .limit(50);

        res.json({ queue });
    }),

    // Approve content
    approveContent: errorMiddleware.catchAsync(async (req, res) => {
        const { contentId } = req.params;
        const moderator = req.user;

        const content = await Content.findById(contentId);
        if (!content) {
            return res.status(404).json({ error: 'Content not found' });
        }

        content.moderation.status = 'approved';
        content.moderation.reviewedBy = moderator._id;
        content.moderation.reviewedAt = new Date();
        await content.save();

        res.json({ message: 'Content approved' });
    }),

    // Reject content
    rejectContent: errorMiddleware.catchAsync(async (req, res) => {
        const { contentId } = req.params;
        const { reason } = req.body;
        const moderator = req.user;

        const content = await Content.findById(contentId);
        if (!content) {
            return res.status(404).json({ error: 'Content not found' });
        }

        content.moderation.status = 'rejected';
        content.moderation.reviewedBy = moderator._id;
        content.moderation.reviewedAt = new Date();
        content.isActive = false;
        
        if (reason) {
            content.moderation.flags.push({
                type: 'moderator_rejection',
                flaggedBy: moderator._id,
                flaggedAt: new Date(),
                reason
            });
        }

        await content.save();

        res.json({ message: 'Content rejected' });
    })
};

module.exports = postController;