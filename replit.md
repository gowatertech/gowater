# GoWater - Water Delivery Management System

## Overview

GoWater is a comprehensive multi-tenant water delivery management system designed to manage the entire lifecycle of water distribution operations. It supports multiple independent companies (tenants) and offers features such as customer management, route optimization, inventory tracking, recurring orders, driver coordination, real-time location tracking, invoicing, and commission calculations. The system aims to streamline water delivery logistics, improve operational efficiency, and provide a robust platform for businesses in the water distribution sector. It is built as a full-stack TypeScript application with a React frontend and an Express backend, utilizing PostgreSQL and Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### October 2025 - Route Optimization & Security Enhancements
- **Mandatory Route Optimization**: Implemented required optimization step in route creation wizard
  - Continue button disabled until route is optimized (enforced via UI state)
  - Visual warning displayed: "⚠️ Debes optimizar la ruta antes de continuar"
  - Backend calculates optimal sequence and distance using Haversine formula
  - Frontend persists optimized distance from backend response to database
  - Double validation prevents bypassing optimization requirement
- **Distance Persistence Fix**: Corrected route creation flow to save optimized totalDistance to database
  - Frontend captures distance from POST /api/routes/optimize response
  - Distance included in create route payload and persisted to routes.total_distance column
  - Verified with e2e tests: distance correctly saved (e.g., 49.70 km for test route)
- **Multi-Tenant Security Hardening**: Added companyId filtering to all critical API endpoints (startRoute, vehicleLoading, commissions) to prevent cross-company data leaks
- **Authentication Fix**: Implemented `normalizeLoginFields` middleware to support both username and email login formats, ensuring compatibility between mobile app (sends username) and web app (sends email)
- **Input Validation**: Added NaN checks after parseInt/Number conversions to prevent invalid data processing
- **Sync Service Fix**: Corrected syncInProgress flag reset using finally block to prevent stuck sync state
- **LocalStorage Error Handling**: Added comprehensive error handling with safe helper functions for localStorage operations in mobile app
- **Database Context Fix**: Removed hardcoded companyId from db-connect.js to ensure proper multi-tenant context
- **Test Accounts**: Created test users for e2e testing (alvinleandro for company 1, conductor_test_15 for company 15, aguamoya@gmail.com for company 15)
- **Route Details Fix**: Fixed RouteMap component to properly fetch route orders using correct queryFn endpoint

## System Architecture

### Multi-Tenancy Design
The system employs a **shared database, shared schema** multi-tenancy model. Data isolation per company is achieved using a `company_id` column in core tables, managed through Express sessions and `AsyncLocalStorage`. Middleware ensures proper company context and prevents cross-tenant data leakage. It distinguishes between platform-level data (companies, plans) and company-specific operational data.

### Authentication & Authorization
Authentication uses **Passport.js Local Strategy** with bcrypt hashing and PostgreSQL-backed sessions. There are dual user systems: Platform users for system administration and Company users with various operational roles (admin, supervisor, cashier, driver, assistant). **Role-Based Access Control (RBAC)** is enforced at both route and component levels.

### Database Architecture
**Drizzle ORM** provides type-safe database queries and migrations. The schema is centralized in `shared/schema.ts`. Key patterns include soft deletes, `created_at`/`updated_at` audit fields, composite keys, and denormalization for historical data. PostgreSQL was chosen for its ACID compliance, geospatial capabilities, and multi-tenancy support, while Drizzle ORM was selected for its TypeScript inference, lightweight nature, and SQL-like syntax.

### Frontend Architecture
Built with **React 18** and TypeScript, using **Wouter** for routing, **TanStack Query** for server state management and caching, **React Hook Form + Zod** for type-safe form validation, and **shadcn/ui + Tailwind CSS** for UI components and styling. The state management strategy prioritizes TanStack Query for server state and React hooks for local UI state, avoiding global state libraries like Redux/Zustand. It features a **mobile-first design** with responsive breakpoints, mobile-specific routes, and touch optimization.

### Backend Architecture
Features **RESTful API endpoints** organized by resource, with modular routing. It distinguishes between platform and company-specific APIs. Key services include a **Route Optimization Service** (using Turf.js for geospatial calculations and nearest-neighbor algorithm), a **Recurring Orders Service** for automated order generation, and a **Storage Service** abstracting database operations with company-scoped queries.

### Real-Time Features
**WebSockets** are implemented for real-time features like driver location tracking and route status updates, providing better performance and efficiency than polling.

### Geographic Data Management
Utilizes a **hierarchical address system** and **Leaflet Maps Integration** for interactive route planning and visualization, supporting zone-based routing.

### File Upload Handling
Uses **Multer Middleware** for in-memory temporary storage with a 5MB file size limit, supporting company logos, product images, and user avatars.

### PDF Generation & Printing
Employs a dual approach: **HTML-to-Canvas** (html2canvas + jsPDF) for complex layouts like invoices, and **Direct jsPDF Generation** for simpler documents and receipts, addressing mobile browser inconsistencies.

### Internationalization (i18n)
Uses **react-i18next** to support Spanish and English, with translation keys in locale files and language persistence in user sessions.

## External Dependencies

### Core Infrastructure
-   **PostgreSQL Database**: Primary data store (Neon serverless recommended).
-   **Environment Variables**: `DATABASE_URL`, `PLATFORM_DATABASE_URL` (optional), `SESSION_SECRET`.

### Third-Party Services

#### Map & Geolocation
-   **Leaflet.js**: Map rendering.
-   **Turf.js**: Geospatial analysis.
-   **OpenStreetMap tiles**: Used for map data (no external map API dependency).

#### Payment Processing
-   **Stripe Integration**: Partial implementation for membership billing (`@stripe/stripe-js`, `@stripe/react-stripe-js`).

#### UI Component Libraries
-   **Radix UI**: Accessible component primitives.
-   **Lucide React**: Icon system.
-   **shadcn/ui**: Pre-composed component patterns.

#### Development & Build Tools
-   **Vite**: Frontend build tool and dev server.
-   **esbuild**: Backend bundling.
-   **Drizzle Kit**: Database schema management.
-   **tsx**: TypeScript execution for scripts.