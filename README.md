
> A **scalable, domain-driven social platform backend** designed for modern campuses — featuring **Multi-Model AI orchestration**, **real-time analytics**, and **enterprise-grade security**.

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-brightgreen?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Architecture-DDD-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Auth-JWT%20%2B%20Refresh-orange?style=for-the-badge" />
  <img src="https://img.shields.io/badge/AI-Multi--LLM-purple?style=for-the-badge" />
</p>

---

## 📌 Overview

**CampusConnect** is an **intelligent backend system** powering a campus-centric social platform.  
It is built to handle **real-time interactions**, **AI-powered moderation**, **predictive analytics**, and **secure multi-role access** — all while remaining **scalable and maintainable**.

The backend serves both **Web (React)** and **Mobile (Flutter)** clients via a centralized **REST + WebSocket API**.

---

## 📖 Table of Contents

- [System Architecture](#-system-architecture)
- [Database Design](#-database-design)
- [Key Features & Modules](#-key-features--modules)
  - [AI Service Layer (Multi-LLM)](#1-ai-service-layer-multi-llm)
  - [Secure Authentication Flow](#2-secure-authentication-flow)
  - [Analytics & Predictive Engine](#3-analytics--predictive-engine)
  - [Content & Moderation Pipeline](#4-content--moderation-pipeline)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Tech Stack](#-tech-stack)
- [Future Enhancements](#-future-enhancements)

---


## 🏗 System Architecture

CampusConnect follows a **Layered Architecture** using the  
**Controller → Service → Repository** pattern to ensure:

- Clear separation of concerns
- Testability
- Horizontal scalability
- 
<img width="5675" height="6125" alt="diagram (8)" src="https://github.com/user-attachments/assets/f6d052d5-3081-4ce5-aca5-71ef5cc43c3f" /># 🎓 CampusConnect – Intelligent Backend System


### 🔹 High-Level Flow

Client Applications (React / Flutter)<br>
↓<br>
API Gateway (REST)<br>
↓<br>
Controller Layer<br>
↓<br>
Service Layer (Business Logic + AI)<br>
↓<br>
Repository Layer<br>
↓<br>
MongoDB + Vector Database

<img width="6505" height="4002" alt="diagram (7)" src="https://github.com/user-attachments/assets/015799c8-7c51-488c-a8a8-b6f79a685829" />




### 🔹 Architectural Highlights

- Feature-based **Domain-Driven Design (DDD)**
- AI logic isolated from core business services
- Analytics pipeline decoupled from transactional data
- Stateless API with secure token rotation

---

## 🗄 Database Design

The database is **normalized and performance-optimized** to support large-scale social interactions.

### 🔑 Design Decisions

- **Separated Content & Comments**  
  → Avoids MongoDB 16MB document size limits

- **Dedicated Analytics Collection**  
  → Enables high-frequency writes without impacting user data

- **Strong Entity Relationships**
  - College → Department → Users
  - Posts → Comments → Reactions

 <img width="6112" height="4145" alt="diagram (13)" src="https://github.com/user-attachments/assets/ce51d04a-7354-4702-a0cb-694b793c62b3" />


---

## 🚀 Key Features & Modules

### 1️⃣ AI Service Layer (Multi-LLM)

A **model-agnostic AI gateway** that dynamically routes requests to different AI providers.

**Supported Providers**
- OpenAI
- Gemini
- OpenRouter

**Capabilities**
- 🧠 Semantic Search (Vector DB)
- 🛡 AI Content Moderation
- 💬 Chat Assistance

**Why it matters**
> Switch AI models based on **cost, latency, or availability** without touching business logic.

📁 `services/ai/`

<img width="3870" height="3493" alt="diagram (10)" src="https://github.com/user-attachments/assets/59e5a911-7812-4e2f-9691-505c35dd7e40" />

---

### 2️⃣ Secure Authentication Flow

Enterprise-grade authentication using **JWT + Refresh Tokens**.

**Flow**
1. User logs in → Access Token + Refresh Token issued
2. Access Token (short-lived) used for API calls
3. Refresh Token rotates securely
4. Session validation prevents token reuse

**Security Highlights**
- Role-based access control (RBAC)
- Token rotation & revocation
- Middleware-level authorization guards

<img width="3570" height="1965" alt="diagram (14)" src="https://github.com/user-attachments/assets/fb0a72d6-0504-4684-b8f0-80c3ac4141eb" />



---

### 3️⃣ Analytics & Predictive Engine (Not External) (Future)

A **dedicated analytics pipeline** that processes raw activity data.

**What it does**
- Tracks user engagement events
- Aggregates usage patterns
- Feeds predictive logic

**Use Cases**
- 📈 User growth forecasting
- 🔁 Churn prediction
- 📊 Feature engagement analysis

<img width="3826" height="780" alt="diagram (16)" src="https://github.com/user-attachments/assets/d571041a-499d-4850-be3c-bad23ed92059" />


---

### 4️⃣ Content & Moderation Pipeline

Every post passes through an **AI-powered moderation workflow**.

**Pipeline**

User Submission<br>
↓<br>
AI Moderation Engine<br>
↓<br>
Approved → Publish & Index<br>
Flagged → Manual Review


<img width="4018" height="2599" alt="diagram (5)" src="https://github.com/user-attachments/assets/2928bf30-f37a-41a0-8698-c348a20c9af1" />



