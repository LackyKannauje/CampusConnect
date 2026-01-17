require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user/User.model');
const College = require('../models/college/College.model');

const seedDatabase = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/collegeupdates');
        console.log('✅ Connected to database');

        // Check if super admin already exists
        const existingSuperAdmin = await User.findOne({ 'academic.role': 'super_admin' });
        if (existingSuperAdmin) {
            console.log('⚠️ Super admin already exists. Skipping seed.');
            process.exit(0);
        }

        // Create first college
        const college = new College({
            name: 'Demo University',
            code: 'TEST',
            domains: [{
                domain: 'demo.edu',
                isVerified: true
            }],
            contact: {
                email: 'admin@demo.edu',
                phone: '+1234567890',
                website: 'https://demo.edu'
            },
            location: {
                city: 'Demo City',
                country: 'Demo Country'
            },
            details: {
                type: 'university',
                establishedYear: 2024,
                description: 'Demo university for testing'
            },
            status: {
                isActive: true,
                isVerified: true
            },
            subscription: {
                plan: 'enterprise',
                status: 'active',
                startDate: new Date(),
                endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            }
        });

        await college.save();
        console.log('✅ College created:', college.name);

        // Create super admin
        const superAdmin = new User({
            email: 'superadmin@demo.edu',
            auth: {
                passwordHash: await bcrypt.hash('Admin@123', 12),
                emailVerified: true
            },
            profile: {
                firstName: 'Super',
                lastName: 'Admin'
            },
            academic: {
                collegeId: college._id,
                role: 'super_admin'
            }
        });

        await superAdmin.save();
        console.log('✅ Super admin created:', superAdmin.email);

        // Add admin to college
        college.admins.push({
            userId: superAdmin._id,
            role: 'owner',
            permissions: ['all'],
            addedAt: new Date(),
            addedBy: superAdmin._id
        });

        await college.save();

        console.log('\n🎉 Seeding completed successfully!');
        console.log('📋 Credentials:');
        console.log('  Email: superadmin@demo.edu');
        console.log('  Password: Admin@123');
        console.log('  College Code: DU');
        console.log('\n🔗 Use these credentials to login and create more colleges/users.');

        process.exit(0);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seedDatabase();