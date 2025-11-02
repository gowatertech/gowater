# GoWater - Water Delivery Management System

## Overview
GoWater is a multi-tenant water delivery management system designed to optimize water distribution operations for various companies. It provides features for customer management, route optimization, inventory tracking, recurring orders, driver coordination, real-time tracking, invoicing, and commission calculations. The system aims to significantly enhance operational efficiency in the water distribution sector, offering a full-stack TypeScript application solution with significant market potential in streamlining logistics and improving customer satisfaction for water delivery businesses.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Multi-Tenancy Design
The system employs a **shared database, shared schema** multi-tenancy model, isolating data per company using `company_id` and `AsyncLocalStorage` in Express sessions.

### Authentication & Authorization
**Passport.js Local Strategy** with bcrypt handles authentication. It supports distinct user types (Platform and Company users) and implements **Role-Based Access Control (RBAC)** at both route and component levels.

### Database Architecture
**Drizzle ORM** with PostgreSQL provides type-safe queries, migrations, soft deletes, audit fields, composite keys, and denormalization. PostgreSQL is chosen for ACID compliance, geospatial capabilities, and native multi-tenancy.

### Frontend Architecture
Built with **React 18** and TypeScript, it uses **Wouter** for routing, **TanStack Query** for server state, and **React Hook Form + Zod** for validation. UI is **shadcn/ui + Tailwind CSS**, following a **mobile-first design** with responsive breakpoints. The application is configured as a **Progressive Web App (PWA)** for mobile installation, enabling standalone mode.

### Backend Architecture
Provides **RESTful API endpoints** with modular routing. Key services include a **Route Optimization Service** (using Turf.js), a **Recurring Orders Service**, and a **Storage Service** for company-scoped operations.

### Real-Time Features
**WebSockets** facilitate real-time driver location tracking and route status updates.

### Geographic Data Management
A **hierarchical address system** integrates with **Leaflet Maps** for interactive route planning, visualization, and precise customer location capture.

### File Upload Handling
**Multer Middleware** manages in-memory file uploads (e.g., company logos, product images) with a 5MB limit.

### PDF Generation & Printing
The system uses **HTML-to-Canvas** (html2canvas + jsPDF) for complex PDF layouts and **Direct jsPDF Generation** for simpler documents.

### Internationalization (i18n)
**react-i18next** supports multilingualism (English and Spanish) with locale file management and session persistence for language preferences.

### Accessibility & Testing Standards
Adheres to **WCAG 2.1** guidelines, including `aria-label` for icon-only buttons and `data-testid` for interactive elements. Features comprehensive testing coverage (e.g., Playwright E2E tests) and a mobile-first responsive design.

### UI/UX Design Approach
Utilizes modern UI components from shadcn/ui with Tailwind CSS for a clean, responsive, and accessible user experience across all devices. A comprehensive user manual with intelligent search and PDF export functionality is also integrated.

### Automatic Invoice Generation & Dynamic Tax Calculation
The system automatically creates invoices when orders are marked as delivered, implementing robust concurrency control to guarantee exactly one invoice per delivered order. It handles dynamic tax calculation, data replication, sequential numbering with company-specific unique constraints, and automatic payment processing for cash invoices within a single, atomic database transaction.

### Partial Cash Payment Handling
The mobile delivery app implements a robust partial payment system allowing drivers to accept partial cash payments. It features frontend detection of partial payments, automatic conversion of payment method for outstanding balances, and backend guard rails with a 1-cent tolerance for float precision.

### Prepaid Invoice System
The system supports prepaid invoices for office payments before delivery, eliminating redundant payment collection during delivery. It detects prepaid orders across mobile and web interfaces, updates order status without creating duplicate invoices, and uses backend guards to prevent duplicate invoice creation for prepaid orders and donations.

### Unified Transaction System
The system implements a comprehensive transaction ledger tracking all financial documents with independent sequential numbering for each document type. Transactions are automatically created on relevant events and are multi-tenant safe. Customer balances are calculated in real-time with automatic updates via PostgreSQL triggers for O(1) performance.

### Customer Advance Payments (Anticipos) System
The system supports comprehensive advance payment tracking with automatic document numbering, integration with the unified transaction system, multi-payment method support, and a unified payment history display. It provides secure, XSS-safe PDF receipt printing and integrates advance balances into customer displays. Advance payments are restricted if a customer has pending invoices.

### Billing Interface with Customer Balance Integration
The billing interface displays real-time customer balance and intelligently handles mixed payment scenarios by applying available advances automatically. It ensures intelligent advance splitting, supports mixed payments, synchronizes customer balances, generates detailed transaction records, and provides context-aware toast notifications.

### Timezone Configuration
The system is configured to use **América/Santo_Domingo timezone (UTC-4)** for all date and time operations across backend and frontend, ensuring consistent and accurate date/time handling.

**Date Formatting Utilities**: All date display across the application uses dedicated RD timezone-aware utility functions from `client/src/lib/date-utils.ts`:
- `formatDateRD()` - Formats dates without time (e.g., "02/11/2024")
- `formatDateTimeRD()` - Formats dates with time in 12-hour format (e.g., "02/11/2024 3:45 PM")
- `formatTimeRD()` - Formats time only (e.g., "3:45 PM")

**Recent Timezone Fixes (Nov 2025)**: Standardized date formatting across billing, payments, and orders modules:
- `client/src/pages/billing/index.tsx` - Invoice list dates
- `client/src/pages/payments/index.tsx` - Payment history dates
- `client/src/pages/payments/register.tsx` - Payment registration dates
- `client/src/pages/orders/list.tsx` - Order list dates (mobile and desktop views)
- `client/src/pages/orders/details.tsx` - Order detail dates
- `client/src/pages/orders/status.tsx` - Order status dates

**Best Practice**: Always use these utility functions instead of manual date parsing or browser-default `toLocaleDateString()` to ensure consistent RD timezone handling throughout the application.

### Payment Method Business Rules
The system enforces specific payment method rules:
- **Default:** "Crédito" for most customers, with manual override options.
- **Charitable Institutions:** Automatically set to "Donación" and locked. Donations must be registered via the orders module.
- **Advance Payment Validation:** Advance payments are blocked if a customer has pending invoices, with clear user messaging.

### Unreturned Bottles Tracking System
The system provides comprehensive tracking and visualization of unreturned returnable bottles to manage deposits and inventory. Features include visual alerts on orders, a dedicated pending bottles report showing orders without return records and incomplete returns, and real-time statistics on the dashboard. An API endpoint `/api/bottle-returns/pending` provides detailed data. A new feature allows manual marking of orders as "bottles not returned".

### Offline-First Mobile Architecture
The mobile driver app implements a comprehensive **offline-first architecture** enabling full functionality without internet connectivity:

#### IndexedDB Persistent Storage
- **Local Database**: Uses IndexedDB (via `idb` library) for client-side data persistence with separate object stores for routes, orders, customers, products, pending actions, and sync metadata. Efficient lookups and bulk save operations are supported.

#### Intelligent Sync Service
- **Automatic Download**: Downloads today's route data (routes, orders, customers, products) when online.
- **Pending Actions Queue**: Queues all offline actions (deliveries, payments, bottle returns, status updates) with retry logic.
- **Auto-Sync**: Automatically syncs pending actions every 30 seconds when connection is available.
- **Connection Monitoring**: Real-time detection of online/offline status with event-driven synchronization.

#### Enhanced Service Worker
- **Multi-Cache Strategy**: Separate caches for static resources, dynamic content, and map tiles.
- **Cache-First for Maps & Static Assets**: OpenStreetMap tiles and static assets are cached with a cache-first strategy.
- **Network-First for HTML**: Dynamic pages fetched from network with cache fallback.
- **Offline Fallback**: Graceful degradation to cached content when offline.

#### Conflict Resolution System
- **Conflict Detection**: Compares client and server timestamps to identify data conflicts.
- **Smart Resolution**: Driver-authoritative strategy for deliveries/payments, server-authoritative for master data, with intelligent data merging.

#### User Experience Features
- **Visual Indicators**: Real-time online/offline status badge, sync status display, manual controls for data download and immediate sync, and toast notifications for sync progress.

## External Dependencies

### Core Infrastructure
-   **PostgreSQL Database**

### Third-Party Services

#### Map & Geolocation
-   **Leaflet.js**: Interactive map rendering.
-   **Turf.js**: Advanced geospatial analysis.
-   **OpenStreetMap tiles**: Map data.

#### Email Service
-   **Resend API**: Powers email notifications for contact and lead forms.

#### Payment Processing
-   **Stripe Integration**: For membership billing.

#### UI Component Libraries
-   **Radix UI**: Accessible component primitives.
-   **Lucide React**: Icon system.
-   **shadcn/ui**: Customizable UI components.