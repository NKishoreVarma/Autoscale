# Autoscale - Enterprise Revenue Automation & Operations Dashboard

[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=flat&logo=firebase)](https://firebase.google.com/)

**Autoscale** is a premium, end-to-end client management, revenue optimization, and project orchestration platform designed to help digital agencies automate operations, track pipeline leaks, and facilitate frictionless client collaboration. Built on a serverless reactive architecture utilizing React, Vite, Tailwind CSS, and Cloud Firebase.

---

## 🚀 Key Features

### 1. High-Conversion Client Portal & Landing Page
* **Interactive ROI Calculator:** Computes estimated revenue gains, operational cost savings, and client scale multipliers instantly.
* **Revenue Leak Map:** Visualizes business drop-offs across acquisition, execution, and expansion funnels.
* **Dynamic Animations:** Responsive, fluid user experience with magnetic interactions, scroll reveals, and parallax layers.
* **Premium Custom Cursor:** Unique target-cursor system that responds smoothly to interactive page components.

### 2. Admin Operations Dashboard
* **Pipeline Kanban Board:** Track client leads and onboarding stages via an interactive drag-and-drop system.
* **Analytics Center:** Built-in charts and telemetry logs tracking conversion rates, monthly recurring revenue (MRR), and workspace utilization.
* **Operations Hub:** Comprehensive pages for managing Bookings, Tasks, Invoices, Client Accounts, Team Members, and Payments.
* **System Telemetry:** Automatic background logging, audit trails, and system health telemetry checkups.

### 3. Client Portal Workspace
* **Secure Login:** Role-restricted client portal backed by Firebase Authentication.
* **Client Hub:** Dashboard displaying ongoing project timelines, pending tasks, shared deliverables, and active invoices.

---

## 🛠️ Tech Stack & Architecture

* **Frontend Framework:** React 19 (Vite SPA template)
* **Styling:** Tailwind CSS (Utility-first styling with custom glassmorphism overrides)
* **Database & Auth:** Firebase Web SDK (Cloud Firestore, Firebase Authentication)
* **Animations:** Vanilla Web Animations & custom Hook-based motion drivers
* **Icons:** Dynamic inline SVG system

### Directory Structure
```text
src/
├── animations/     # Scroll reveal, magnetic, and parallax drivers
├── components/     # Landing pages, CTA, calculator, and custom cursor
│   └── admin/      # Back-office components (leads, kanban boards, layout)
├── context/        # Global Auth and Firebase state management
├── data/           # Services, solutions, and industries data structures
├── hooks/          # Firestore listeners (useClients, useProjects, useTasks)
├── pages/          # Admin pages (payments, team, bookings) and Client Portal
└── utils/          # Audit logs, health checks, and analytics telemetry
```

---

## 📦 Getting Started

### Prerequisites
* **Node.js:** Ensure Node.js (v18+) is installed.
* **Firebase Project:** A Firebase project set up with Authentication and Firestore enabled.

### Installation

1. **Clone the Repository:**
   ```bash
   git clone git@github.com:NKishoreVarma/Autoscale.git
   cd Autoscale
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your Firebase credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Run Local Development Server:**
   ```bash
   npm run dev
   ```

---

## 👨‍💻 Developer Profile

### Kishore Varma (NKishoreVarma)
**Full-Stack & Interactive Application Engineer**

Specializing in building visually stunning, performant React ecosystems and robust cloud architectures. Dedicated to delivering premium user interfaces, smooth interactions, and optimized application pipelines.

* **GitHub:** [@NKishoreVarma](https://github.com/NKishoreVarma)
* **Core Expertise:**
  * React & Modern Frontend Architectures (Vite, Next.js)
  * Serverless Cloud Frameworks (Firebase Auth, Firestore, Security Rules)
  * Advanced UI/UX, Glassmorphism, Responsive CSS Layouts, & Custom Motion Physics
  * Telemetry Systems, Background Audit Logging, and Health Performance
