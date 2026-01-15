const College = require('../../models/college/College.model');
const Department = require('../../models/college/Department.model');
const User = require('../../models/user/User.model');
const Invitation = require('../../models/college/Invitation.model');
const Analytics = require('../../models/analytics/Analytics.model');
const cloudinary = require('cloudinary').v2;
const Pagination = require('../../utils/pagination');
const errorMiddleware  = require('../../middleware/error.middleware');

const collegeController = {
    // Get all colleges (public)
    getAllColleges: errorMiddleware.catchAsync(async (req, res) => {
        const { search, city, type } = req.query;

        let query = { 'status.isActive': true };

        if (search) {
            query.$or = [
                { name: new RegExp(search, 'i') },
                { code: new RegExp(search, 'i') }
            ];
        }

        if (city) query['location.city'] = new RegExp(city, 'i');
        if (type) query['details.type'] = type;

        const result = await Pagination.paginate(College, query, {
            page: req.pagination.page,
            limit: req.pagination.limit,
            select: 'name code details.type location.city stats.users.total media.logo'
        });

        res.json(result);
    }),

    // Search colleges (public)
    searchColleges: errorMiddleware.catchAsync(async (req, res) => {
        const { q: searchTerm } = req.query;

        if (!searchTerm || searchTerm.length < 2) {
            return res.status(400).json({ error: 'Search term must be at least 2 characters' });
        }

        const colleges = await College.find({
            'status.isActive': true,
            $text: { $search: searchTerm }
        })
        .select('name code location.city stats.users.total')
        .limit(10);

        res.json({ results: colleges });
    }),

    // Get college by code (public)
    getCollegeByCode: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeCode } = req.params;

        const college = await College.findOne({ 
            code: collegeCode.toUpperCase(),
            'status.isActive': true 
        })
        .select('-subscription -admins -config -aiConfig')
        .populate('departments.id', 'name code');

        if (!college) {
            return res.status(404).json({ error: 'College not found' });
        }

        const response = {
            id: college._id,
            name: college.name,
            code: college.code,
            details: college.details,
            location: college.location,
            media: college.media,
            stats: college.stats,
            departments: college.departments,
            social: college.social,
            createdAt: college.createdAt
        };

        res.json(response);
    }),

    // Create college (super admin only)
    createCollege: errorMiddleware.catchAsync(async (req, res) => {
        const { name, code, emailDomain } = req.body;
        const files = req.files;
        const admin = req.user;

        // Check if college code already exists
        const existingCollege = await College.findOne({ code: code.toUpperCase() });
        if (existingCollege) {
            return res.status(400).json({ error: 'College code already exists' });
        }

        // Upload logo if provided
        let logo = {};
        if (files?.logo?.[0]) {
            const result = await cloudinary.uploader.upload(files.logo[0].path, {
                folder: 'college_updates/logos',
                width: 300,
                height: 300,
                crop: 'fill'
            });
            logo = {
                url: result.secure_url,
                thumbnail: cloudinary.url(result.public_id, {
                    width: 100,
                    height: 100,
                    crop: 'fill'
                })
            };
        }

        // Upload banner if provided
        let banner = {};
        if (files?.banner?.[0]) {
            const result = await cloudinary.uploader.upload(files.banner[0].path, {
                folder: 'college_updates/banners',
                width: 1200,
                height: 400,
                crop: 'fill'
            });
            banner = {
                url: result.secure_url
            };
        }

        // Create college
        const college = new College({
            name,
            code: code.toUpperCase(),
            domains: [{
                domain: emailDomain.toLowerCase(),
                isVerified: false
            }],
            media: {
                logo,
                banner
            },
            admins: [{
                userId: admin._id,
                role: 'owner',
                permissions: ['all'],
                addedAt: new Date(),
                addedBy: admin._id
            }],
            subscription: {
                plan: 'free',
                status: 'active',
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days trial
            }
        });

        await college.save();

        // Update admin user role to college_admin
        admin.academic.role = 'college_admin';
        admin.academic.collegeId = college._id;
        await admin.save();

        res.status(201).json({
            message: 'College created successfully',
            college: {
                id: college._id,
                name: college.name,
                code: college.code,
                domains: college.domains
            }
        });
    }),

    // Update college
    updateCollege: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.params;
        const updates = req.body;
        const user = req.user;

        const college = await College.findById(collegeId);
        if (!college) {
            return res.status(404).json({ error: 'College not found' });
        }

        // Check permissions
        const isSuperAdmin = user.academic.role === 'super_admin';
        const isCollegeAdmin = college.admins.some(admin => 
            admin.userId.equals(user._id) && 
            ['owner', 'admin'].includes(admin.role)
        );

        if (!isSuperAdmin && !isCollegeAdmin) {
            return res.status(403).json({ error: 'Not authorized to update college' });
        }

        // Update allowed fields
        const allowedUpdates = [
            'details', 'location', 'contact', 'social', 'settings'
        ];

        allowedUpdates.forEach(field => {
            if (updates[field]) {
                college[field] = { ...college[field], ...updates[field] };
            }
        });

        await college.save();

        res.json({
            message: 'College updated successfully',
            college: {
                id: college._id,
                name: college.name,
                code: college.code
            }
        });
    }),

    // Delete college (super admin only)
    deleteCollege: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.params;

        const college = await College.findById(collegeId);
        if (!college) {
            return res.status(404).json({ error: 'College not found' });
        }

        // Check if college has users
        const userCount = await User.countDocuments({ 'academic.collegeId': collegeId });
        if (userCount > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete college with active users' 
            });
        }

        // Soft delete
        college.status.isActive = false;
        await college.save();

        res.json({ message: 'College deactivated successfully' });
    }),

    // Invite to college
    inviteToCollege: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.params;
        const { email, name, role, departmentCode, message } = req.body;
        const inviter = req.user;

        const college = await College.findById(collegeId);
        if (!college) {
            return res.status(404).json({ error: 'College not found' });
        }

        // Check if user already exists with this email
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }

        // Check if invitation already exists
        const existingInvitation = await Invitation.findOne({
            collegeId,
            email,
            status: { $in: ['pending', 'sent', 'delivered', 'opened'] }
        });

        if (existingInvitation) {
            return res.status(400).json({ error: 'Invitation already sent to this email' });
        }

        // Get department if code provided
        let departmentId = null;
        if (departmentCode) {
            const department = await Department.findOne({
                collegeId,
                code: departmentCode.toUpperCase()
            });
            if (department) {
                departmentId = department._id;
            }
        }

        // Create invitation
        const invitation = await Invitation.createInvitation({
            type: 'college_join',
            collegeId,
            invitedBy: inviter._id,
            email: email.toLowerCase(),
            name,
            role: role || 'student',
            data: {
                departmentCode,
                message
            },
            departmentId,
            days: 7
        });

        // TODO: Send invitation email
        const inviteUrl = `${process.env.FRONTEND_URL}/join/${invitation.token}`;
        console.log(`Invitation URL: ${inviteUrl}`); // In production, send email

        res.status(201).json({
            message: 'Invitation sent successfully',
            invitation: {
                id: invitation._id,
                email: invitation.email,
                expiresAt: invitation.expiresAt
            }
        });
    }),

    // Get invitation
    getInvitation: errorMiddleware.catchAsync(async (req, res) => {
        const { token } = req.params;

        const invitation = await Invitation.findValidByToken(token);
        if (!invitation) {
            return res.status(404).json({ error: 'Invalid or expired invitation' });
        }

        res.json({
            invitation: {
                college: invitation.collegeId.name,
                invitedBy: invitation.invitedBy,
                email: invitation.email,
                role: invitation.role,
                expiresAt: invitation.expiresAt
            }
        });
    }),

    // Accept invitation
    acceptInvitation: errorMiddleware.catchAsync(async (req, res) => {
        const { token } = req.params;
        const user = req.user;

        const invitation = await Invitation.findValidByToken(token);
        if (!invitation) {
            return res.status(404).json({ error: 'Invalid or expired invitation' });
        }

        // Check if user email matches invitation
        if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
            return res.status(403).json({ 
                error: 'Invitation email does not match your account' 
            });
        }

        // Check if user already in a college
        if (user.academic.collegeId) {
            return res.status(400).json({ 
                error: 'You are already part of a college' 
            });
        }

        // Accept invitation
        const accepted = invitation.accept();
        if (!accepted) {
            return res.status(400).json({ error: 'Failed to accept invitation' });
        }

        await invitation.save();

        // Update user college info
        user.academic.collegeId = invitation.collegeId;
        user.academic.role = invitation.role;
        
        if (invitation.departmentId) {
            user.academic.departmentId = invitation.departmentId;
            // Get department name
            const department = await Department.findById(invitation.departmentId);
            if (department) {
                user.academic.departmentName = department.name;
            }
        }

        if (invitation.data.rollNumber) {
            user.academic.rollNumber = invitation.data.rollNumber;
        }

        await user.save();

        // Update college stats
        const college = await College.findById(invitation.collegeId);
        if (college) {
            college.stats.users.total += 1;
            if (invitation.role === 'student') {
                college.stats.users.students += 1;
            } else if (invitation.role === 'faculty') {
                college.stats.users.faculty += 1;
            }
            await college.save();
        }

        res.json({ 
            message: 'Invitation accepted successfully',
            college: {
                id: college._id,
                name: college.name,
                code: college.code
            }
        });
    }),

    // Reject invitation
    rejectInvitation: errorMiddleware.catchAsync(async (req, res) => {
        const { token } = req.params;
        const user = req.user;

        const invitation = await Invitation.findValidByToken(token);
        if (!invitation) {
            return res.status(404).json({ error: 'Invalid or expired invitation' });
        }

        // Check if user email matches invitation
        if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
            return res.status(403).json({ 
                error: 'Invitation email does not match your account' 
            });
        }

        invitation.reject();
        await invitation.save();

        res.json({ message: 'Invitation rejected' });
    }),

    // Get college stats
    getCollegeStats: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.params;

        const college = await College.findById(collegeId)
            .select('stats departments media.logo');

        if (!college) {
            return res.status(404).json({ error: 'College not found' });
        }

        // Get recent analytics
        const recentAnalytics = await Analytics.findOne({
            collegeId,
            period: 'daily'
        }).sort({ timestamp: -1 });

        const stats = {
            users: college.stats.users,
            departments: college.departments.length,
            activeDepartments: college.departments.filter(d => d.studentCount > 0).length,
            recentEngagement: recentAnalytics?.engagement || {},
            updatedAt: college.stats.lastUpdated
        };

        res.json(stats);
    }),

    // Get college analytics
    getCollegeAnalytics: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.params;
        const { period = 'monthly', startDate, endDate } = req.query;

        const analytics = await Analytics.find({
            collegeId,
            period,
            ...(startDate && endDate && {
                timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) }
            })
        })
        .sort({ timestamp: 1 })
        .limit(30);

        res.json({ analytics });
    }),

    // Get college settings
    getCollegeSettings: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.params;

        const college = await College.findById(collegeId)
            .select('config settings aiConfig subscription');

        if (!college) {
            return res.status(404).json({ error: 'College not found' });
        }

        res.json({
            config: college.config,
            settings: college.settings,
            aiConfig: college.aiConfig,
            subscription: college.subscription
        });
    }),

    // Update college settings
    updateCollegeSettings: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.params;
        const { config, settings, aiConfig } = req.body;

        const college = await College.findById(collegeId);
        if (!college) {
            return res.status(404).json({ error: 'College not found' });
        }

        if (config) college.config = { ...college.config, ...config };
        if (settings) college.settings = { ...college.settings, ...settings };
        if (aiConfig) college.aiConfig = { ...college.aiConfig, ...aiConfig };

        await college.save();

        res.json({
            message: 'College settings updated successfully',
            settings: {
                config: college.config,
                settings: college.settings,
                aiConfig: college.aiConfig
            }
        });
    }),

    // Get subscription
    getSubscription: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.params;

        const college = await College.findById(collegeId)
            .select('subscription config.limits');

        if (!college) {
            return res.status(404).json({ error: 'College not found' });
        }

        res.json({
            subscription: college.subscription,
            limits: college.config.limits,
            daysRemaining: Math.ceil((college.subscription.endDate - new Date()) / (1000 * 60 * 60 * 24))
        });
    }),

    // Upgrade subscription
    upgradeSubscription: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.params;
        const { plan } = req.body;

        const college = await College.findById(collegeId);
        if (!college) {
            return res.status(404).json({ error: 'College not found' });
        }

        const plans = {
            'free': { maxUsers: 100, maxStorage: 1 },
            'basic': { maxUsers: 1000, maxStorage: 10 },
            'pro': { maxUsers: 10000, maxStorage: 100 },
            'enterprise': { maxUsers: 50000, maxStorage: 1000 }
        };

        if (!plans[plan]) {
            return res.status(400).json({ error: 'Invalid plan' });
        }

        // Update subscription
        college.subscription.plan = plan;
        college.subscription.status = 'active';
        college.subscription.startDate = new Date();
        college.subscription.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        
        // Update limits
        college.config.limits.maxUsers = plans[plan].maxUsers;
        college.config.limits.maxStorage = plans[plan].maxStorage;

        await college.save();

        res.json({
            message: 'Subscription upgraded successfully',
            subscription: college.subscription,
            newLimits: college.config.limits
        });
    }),

    // Cancel subscription
    cancelSubscription: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.params;

        const college = await College.findById(collegeId);
        if (!college) {
            return res.status(404).json({ error: 'College not found' });
        }

        college.subscription.status = 'cancelled';
        college.subscription.autoRenew = false;
        await college.save();

        res.json({ 
            message: 'Subscription cancelled successfully',
            activeUntil: college.subscription.endDate
        });
    })
};

module.exports = collegeController;