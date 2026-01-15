const mongoose = require('mongoose');
const crypto = require('crypto');
const { BaseSchema, TimestampsPlugin } = require('../shared/BaseSchema');

const invitationSchema = new mongoose.Schema({
    // Invitation Details
    token: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    type: {
        type: String,
        enum: ['college_join', 'department_join', 'faculty_invite', 'admin_invite', 'collaborator'],
        required: true
    },
    
    // Target
    collegeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'College',
        required: true,
        index: true
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    },
    
    // Inviter & Invitee
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    name: String,
    role: {
        type: String,
        enum: ['student', 'faculty', 'admin', 'moderator', 'collaborator'],
        default: 'student'
    },
    
    // Invitation Data
    data: {
        batch: String,
        departmentCode: String,
        rollNumber: String,
        permissions: [String],
        message: String
    },
    
    // Status
    status: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'opened', 'accepted', 'rejected', 'expired', 'revoked'],
        default: 'pending',
        index: true
    },
    
    // Tracking
    tracking: {
        sentAt: Date,
        deliveredAt: Date,
        openedAt: Date,
        openedCount: { type: Number, default: 0 },
        lastOpened: Date,
        acceptedAt: Date,
        rejectedAt: Date,
        revokedAt: Date,
        ipAddress: String,
        userAgent: String
    },
    
    // Expiry
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    maxUses: {
        type: Number,
        default: 1
    },
    uses: {
        type: Number,
        default: 0,
        max: 10
    },
    
    // Security
    security: {
        requireDomain: { type: Boolean, default: true },
        requireVerification: { type: Boolean, default: true },
        singleUse: { type: Boolean, default: true },
        passwordProtected: { type: Boolean, default: false },
        passwordHash: String
    },
    
    // Notifications
    notifications: {
        reminderSent: { type: Boolean, default: false },
        reminderCount: { type: Number, default: 0 },
        lastReminder: Date
    },
    
    // Base Schema
    ...BaseSchema
}, {
    timestamps: true
});

// Apply Timestamps Plugin
TimestampsPlugin(invitationSchema);

// Indexes
invitationSchema.index({ token: 1 }, { unique: true });
invitationSchema.index({ collegeId: 1, email: 1, status: 1 });
invitationSchema.index({ email: 1, status: 1 });
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
invitationSchema.index({ invitedBy: 1, createdAt: -1 });
invitationSchema.index({ status: 1, expiresAt: 1 });

// Middleware
invitationSchema.pre('save', function(next) {
    // Generate token if not present
    if (!this.token) {
        this.token = crypto.randomBytes(32).toString('hex');
    }
    
    // Set default expiry (7 days)
    if (!this.expiresAt) {
        this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
    
    // Auto-set status based on actions
    if (this.isNew && this.status === 'pending') {
        this.status = 'sent';
        this.tracking.sentAt = new Date();
    }
    
    next();
});

// Virtual Fields
invitationSchema.virtual('isExpired').get(function() {
    return new Date() > this.expiresAt;
});

invitationSchema.virtual('isValid').get(function() {
    return this.status === 'sent' || this.status === 'delivered' || this.status === 'opened';
});

invitationSchema.virtual('daysRemaining').get(function() {
    const remaining = this.expiresAt - new Date();
    return Math.ceil(remaining / (1000 * 60 * 60 * 24));
});

// Methods
invitationSchema.methods.markDelivered = function() {
    if (this.status === 'sent') {
        this.status = 'delivered';
        this.tracking.deliveredAt = new Date();
        return true;
    }
    return false;
};

invitationSchema.methods.markOpened = function(ip = null, userAgent = null) {
    if (this.isValid && !this.isExpired) {
        this.status = 'opened';
        this.tracking.openedAt = this.tracking.openedAt || new Date();
        this.tracking.lastOpened = new Date();
        this.tracking.openedCount += 1;
        
        if (ip) this.tracking.ipAddress = ip;
        if (userAgent) this.tracking.userAgent = userAgent;
        
        return true;
    }
    return false;
};

invitationSchema.methods.accept = function() {
    if (this.isValid && !this.isExpired && this.uses < this.maxUses) {
        this.status = 'accepted';
        this.tracking.acceptedAt = new Date();
        this.uses += 1;
        return true;
    }
    return false;
};

invitationSchema.methods.reject = function() {
    if (this.isValid && !this.isExpired) {
        this.status = 'rejected';
        this.tracking.rejectedAt = new Date();
        return true;
    }
    return false;
};

invitationSchema.methods.revoke = function() {
    if (this.status !== 'accepted' && this.status !== 'revoked') {
        this.status = 'revoked';
        this.tracking.revokedAt = new Date();
        return true;
    }
    return false;
};

invitationSchema.methods.canResend = function() {
    return this.status === 'expired' || 
           (this.status === 'pending' && this.tracking.openedCount === 0);
};

invitationSchema.methods.validateDomain = function(email) {
    if (!this.security.requireDomain) return true;
    
    const domain = email.split('@')[1];
    const College = mongoose.model('College');
    
    return College.findOne({
        _id: this.collegeId,
        'domains.domain': domain,
        'domains.isVerified': true
    }).then(college => !!college);
};

// Static Methods
invitationSchema.statics.createInvitation = async function(data) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + (data.days || 7) * 24 * 60 * 60 * 1000);
    
    const invitation = new this({
        ...data,
        token,
        expiresAt,
        status: 'pending'
    });
    
    return invitation.save();
};

invitationSchema.statics.findValidByToken = function(token) {
    return this.findOne({
        token,
        status: { $in: ['sent', 'delivered', 'opened'] },
        expiresAt: { $gt: new Date() },
        uses: { $lt: '$maxUses' }
    }).populate('collegeId', 'name code domains')
      .populate('departmentId', 'name code');
};

invitationSchema.statics.getCollegeInvitations = function(collegeId, status = null) {
    const query = { collegeId };
    if (status) query.status = status;
    
    return this.find(query)
        .sort({ createdAt: -1 })
        .populate('invitedBy', 'profile.firstName profile.lastName')
        .populate('departmentId', 'name code');
};

invitationSchema.statics.cleanupExpired = function() {
    return this.updateMany(
        {
            expiresAt: { $lt: new Date() },
            status: { $in: ['pending', 'sent', 'delivered', 'opened'] }
        },
        { status: 'expired' }
    );
};

invitationSchema.statics.getStats = function(collegeId) {
    return this.aggregate([
        { $match: { collegeId: mongoose.Types.ObjectId(collegeId) } },
        { $group: {
            _id: '$status',
            count: { $sum: 1 },
            emails: { $addToSet: '$email' }
        }},
        { $project: {
            status: '$_id',
            count: 1,
            uniqueEmails: { $size: '$emails' },
            _id: 0
        }},
        { $sort: { count: -1 } }
    ]);
};

const Invitation = mongoose.model('Invitation', invitationSchema);

module.exports = Invitation;