# 🎓 CampusConnect – Intelligent Backend System

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

### 🔹 High-Level Flow

Client Applications (React / Flutter)<br>
↓<br>
API Gateway (REST + WebSockets)<br>
↓<br>
Controller Layer<br>
↓<br>
Service Layer (Business Logic + AI)<br>
↓<br>
Repository Layer<br>
↓<br>
MongoDB + Vector Database




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

---

### 3️⃣ Analytics & Predictive Engine

A **dedicated analytics pipeline** that processes raw activity data.

**What it does**
- Tracks user engagement events
- Aggregates usage patterns
- Feeds predictive logic

**Use Cases**
- 📈 User growth forecasting
- 🔁 Churn prediction
- 📊 Feature engagement analysis

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





