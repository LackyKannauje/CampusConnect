# CampusConnect API Documentation

Welcome to the CampusConnect API documentation. This document provides a comprehensive guide to the available endpoints, request structures, and response formats.

## Base URL
All API requests should be made to:
`http://localhost:3000/api/v1` (Adjust based on your environment)

## Authentication
Most endpoints require authentication using a Bearer Token. Including the token in the header as follows:
`Authorization: Bearer <your_access_token>`

## Table of Contents
1. [Authentication](#authentication-auth)
2. [User Management](#user-management-users)
3. [College Management](#college-management-college)
4. [Content & Social](#content--social-content)
5. [AI Services](#ai-services-ai)
6. [Analytics](#analytics-analytics)

---

## 1. Authentication (`/auth`)
Base Path: `/auth`

### Public Endpoints

#### Register
- **URL**: `/register`
- **Method**: `POST`
- **Description**: Register a new user.
- **Body**:
    ```json
    {
        "name": "John Doe",
        "email": "john@example.com",
        "password": "securepassword"
    }
    ```
- **Response**: `201 Created`

#### Login
- **URL**: `/login`
- **Method**: `POST`
- **Description**: Login a user and receive an access token.
- **Body**:
    ```json
    {
        "email": "john@example.com",
        "password": "securepassword"
    }
    ```
- **Response**: `200 OK` (includes token)

#### Forgot Password
- **URL**: `/forgot-password`
- **Method**: `POST`
- **Body**: `{"email": "john@example.com"}`

#### Reset Password
- **URL**: `/reset-password/:token`
- **Method**: `POST`
- **Body**: `{"password": "newpassword"}`

#### Verify Email
- **URL**: `/verify-email/:token`
- **Method**: `GET`

### Social Auth
- **Google**: `POST /google`
- **GitHub**: `POST /github`

### Protected Endpoints (Requires Auth)

#### Logout
- **URL**: `/logout`
- **Method**: `POST`

#### Refresh Token
- **URL**: `/refresh-token`
- **Method**: `POST`

#### Change Password
- **URL**: `/change-password`
- **Method**: `POST`
- **Body**: `{"currentPassword": "...", "newPassword": "..."}`

#### Two-Factor Authentication
- **Enable 2FA**: `POST /enable-2fa`
- **Verify 2FA**: `POST /verify-2fa` (Body: `{"token": "123456"}`)

#### Session Management
- **Get Sessions**: `GET /sessions`
- **Revoke Session**: `DELETE /sessions/:sessionId`

---

## 2. User Management (`/users`)
Base Path: `/users`

### Profile
- **Get Profile**: `GET /profile`
- **Update Profile**: `PUT /profile` (Body: `{"name": "...", "bio": "..."}`)
- **Upload Avatar**: `POST /profile/avatar` (Multipart form-data: `avatar`)
- **Get Public Profile**: `GET /profile/:userId`

### Social Features
- **Follow User**: `POST /:userId/follow`
- **Unfollow User**: `DELETE /:userId/unfollow`
- **Get Followers**: `GET /:userId/followers`
- **Get Following**: `GET /:userId/following`

### Settings
- **Get Settings**: `GET /settings`
- **Update Settings**: `PUT /settings`

### Admin/Management
- **Get All Users**: `GET /` (Admin/College Admin)
- **Search Users**: `GET /search?q=query`
- **Get User by ID**: `GET /:userId`
- **Update User**: `PUT /:userId` (Admin/College Admin)
- **Delete User**: `DELETE /:userId` (Admin)
- **Ban User**: `POST /:userId/ban` (Admin)
- **Unban User**: `POST /:userId/unban` (Admin)
- **Analytics**: `GET /:userId/analytics`
- **Activity**: `GET /:userId/activity`

---

## 3. College Management (`/college`)
Base Path: `/college`

### Public
- **List Colleges**: `GET /colleges` (Query: `page`)
- **Search Colleges**: `GET /colleges/search?q=query`
- **Get College**: `GET /colleges/:collegeCode`

### Management (Admin)
- **Create College**: `POST /create` (Super Admin. Multipart: `logo`, `banner`, `name`, `code` etc.)
- **Update College**: `PUT /colleges/:collegeId`
- **Delete College**: `DELETE /colleges/:collegeId` (Super Admin)
- **Invite User**: `POST /colleges/:collegeId/invite` (Body: `{"email": "..."}`)
- **Get Stats**: `GET /colleges/:collegeId/stats`
- **Get Analytics**: `GET /colleges/:collegeId/analytics`
- **Settings**: `GET` & `PUT` `/colleges/:collegeId/settings`

### Departments
- **List Departments**: `GET /colleges/:collegeId/departments`
- **Create Department**: `POST /colleges/:collegeId/departments` (Body: `{"name": "..."}`)
- **Get Department**: `GET /departments/:departmentId`
- **Update Department**: `PUT /departments/:departmentId`
- **Delete Department**: `DELETE /departments/:departmentId`

### Department Members
- **List Members**: `GET /departments/:departmentId/members`
- **Add Member**: `POST /departments/:departmentId/members/:userId`
- **Remove Member**: `DELETE /departments/:departmentId/members/:userId`

### Subscription (Admin)
- **Get Subscription**: `GET /colleges/:collegeId/subscription`
- **Upgrade**: `POST /colleges/:collegeId/subscription/upgrade`
- **Cancel**: `POST /colleges/:collegeId/subscription/cancel`

---

## 4. Content & Social (`/content`)
Base Path: `/content`

### Posts
- **List Posts**: `GET /posts`
- **User Feed**: `GET /posts/feed`
- **Trending**: `GET /posts/trending`
- **Search**: `GET /posts/search?q=query`
- **Create Post**: `POST /posts` (Multipart: `content`, `media` array)
- **Get Post**: `GET /posts/:postId`
- **Update Post**: `PUT /posts/:postId`
- **Delete Post**: `DELETE /posts/:postId`

### Post Interactions
- **Like**: `POST /posts/:postId/like`
- **Unlike**: `DELETE /posts/:postId/like`
- **Save**: `POST /posts/:postId/save`
- **Unsave**: `DELETE /posts/:postId/save`
- **Share**: `POST /posts/:postId/share`
- **Report**: `POST /posts/:postId/report`

### Comments
- **Get Comments**: `GET /posts/:postId/comments`
- **Add Comment**: `POST /posts/:postId/comments` (Body: `{"content": "..."}`)
- **Get Comment**: `GET /comments/:commentId`
- **Update**: `PUT /comments/:commentId`
- **Delete**: `DELETE /comments/:commentId`
- **Like**: `POST /comments/:commentId/like`
- **Unlike**: `DELETE /comments/:commentId/like`
- **Replies**: `GET /comments/:commentId/replies`
- **Report**: `POST /comments/:commentId/report`

### Media
- **Upload**: `POST /media/upload` (Multipart: `file`)
- **Get Media**: `GET /media/:mediaId`
- **Delete**: `DELETE /media/:mediaId`
- **List Media**: `GET /media`

### Content Moderation (Admin/Mod)
- **Queue**: `GET /moderation/queue`
- **Approve**: `POST /moderation/:contentId/approve`
- **Reject**: `POST /moderation/:contentId/reject`

---

## 5. AI Services (`/ai`)
Base Path: `/ai`

### Content Processing
- **Moderate**: `POST /moderate` (Body: `{"content": "..."}`)
- **Tag**: `POST /tag` (Body: `{"content": "..."}`)
- **Summarize**: `POST /summarize` (Body: `{"content": "..."}`)
- **Embedding**: `POST /embedding` (Body: `{"content": "..."}`)

### Search & Chat
- **Semantic Search**: `POST /search/semantic` (Body: `{"query": "..."}`)
- **Suggestions**: `GET /search/suggest?q=...`
- **Chat**: `POST /chat` (Body: `{"message": "..."}`)
- **Study Assistant**: `POST /study-assistant` (Body: `{"topic": "..."}`)
- **Code Help**: `POST /code-help` (Body: `{"code": "..."}`)

### Recommendations
- **Content**: `GET /recommendations/content`
- **Users**: `GET /recommendations/users`
- **Study**: `GET /recommendations/study`

### Management (Admin)
- **Get Config**: `GET /config`
- **Update Config**: `PUT /config`
- **Usage Stats**: `GET /usage`
- **Cost**: `GET /usage/cost`
- **Top Users**: `GET /usage/top-users`
- **Submit Feedback**: `POST /feedback/:requestId`
- **Health**: `GET /health`

---

## 6. Analytics (`/analytics`)
Base Path: `/analytics`

### Platform (Super Admin)
- **Overview**: `GET /platform/overview`
- **Users**: `GET /platform/users`
- **Colleges**: `GET /platform/colleges`
- **Engagement**: `GET /platform/engagement`

### College (Admin)
- **Overview**: `GET /college/:collegeId/overview`
- **Users**: `GET /college/:collegeId/users`
- **Content**: `GET /college/:collegeId/content`
- **Engagement**: `GET /college/:collegeId/engagement`
- **Departments**: `GET /college/:collegeId/departments`
- **Leaderboards (Users)**: `GET /leaderboards/:collegeId/users`
- **Leaderboards (Depts)**: `GET /leaderboards/:collegeId/departments`
- **Export**: `POST /export/:collegeId`

### Real-time
- **Stats**: `GET /realtime/:collegeId`
- **Active Users**: `GET /realtime/:collegeId/active-users`

### User Specific
- **Overview**: `GET /user/:userId/overview`
- **Activity**: `GET /user/:userId/activity`
- **Engagement**: `GET /user/:userId/engagement`
- **Trends**: `GET /user/:userId/trends`

### Content Specific
- **Analytics**: `GET /content/:contentId`
- **Popular**: `GET /content/popular`
- **Trending**: `GET /content/trending`
- **Predictions**: `GET /predictions/content/:contentId`

### Predictive
- **Churn**: `GET /predictions/:collegeId/churn`
- **Growth**: `GET /predictions/:collegeId/growth`
