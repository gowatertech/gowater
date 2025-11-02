# GoWater - Water Delivery Management System

## Overview
GoWater is a multi-tenant water delivery management system designed to optimize water distribution operations for various companies. It provides features for customer management, route optimization, inventory tracking, recurring orders, driver coordination, real-time tracking, invoicing, and commission calculations. The system aims to significantly enhance operational efficiency in the water distribution sector, offering a full-stack TypeScript application solution with significant market potential in streamlining logistics and improving customer satisfaction for water delivery businesses.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

### November 2, 2025 - Offline Sync Service Fix
- **Fixed**: Offline functionality in mobile app was not working because sync service initialization was commented out in `client/src/main.tsx`
- **Resolution**: Uncommented and corrected the sync service initialization to use the proper file path (`./lib/sync-service` instead of `./lib/syncService`)
- **Impact**: Mobile offline mode now properly initializes online/offline event listeners, auto-sync interval, and connection monitoring at application startup

## System Architecture

### Multi-Tenancy Design
The system employs a **shared database, shared schema** multi-tenancy model, isolating data per company using `company_id` and `AsyncLocalStorage` in Express sessions.

### Authentication & Authorization
**Passport.js Local Strategy** with bcrypt handles authentication. It supports distinct user types (Platform and Company users) and implements **Role-Based Access Control (RBAC)** at both route and component levels.

### Database Architecture
**Drizzle ORM** with PostgreSQL provides type-safe queries, migrations, soft deletes, audit fields, composite keys, and denormalization. PostgreSQL is chosen for ACID compliance, geospatial capabilities, and native multi-tenancy.

### Frontend Architecture
Built with **React 18** and TypeScript, it uses **Wouter** for routing, **TanStack Query** for server state, and **React Hook Form + Zod** for validation. UI is **shadcn/ui + Tailwind CSS**, following a **mobile-first design** with responsive breakpoints. The application is also configured as a **Progressive Web App (PWA)** for mobile installation, including manifest, icons, and iOS support, enabling standalone mode.

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
The system automatically creates invoices when orders are marked as delivered, implementing robust concurrency control to guarantee exactly one invoice per delivered order. It handles dynamic tax calculation, data replication, sequential numbering with company-specific unique constraints, and automatic payment processing for cash invoices within a single, atomic database transaction. Concurrency safety is ensured through row-level locking and duplicate prevention.

### Partial Cash Payment Handling
The mobile delivery app implements a robust partial payment system allowing drivers to accept partial cash payments. It features frontend detection of partial payments, automatic conversion of payment method for outstanding balances, and backend guard rails with a 1-cent tolerance for float precision.

### Prepaid Invoice System
The system supports prepaid invoices for office payments before delivery, eliminating redundant payment collection during delivery. It detects prepaid orders across mobile and web interfaces, updates order status without creating duplicate invoices, and uses backend guards to prevent duplicate invoice creation for prepaid orders and donations.

### Unified Transaction System
The system implements a comprehensive transaction ledger tracking all financial documents with independent sequential numbering for each document type (e.g., FT, RI, ANT). Transactions are automatically created on relevant events and are multi-tenant safe. Customer balances are calculated in real-time with automatic updates via PostgreSQL triggers for O(1) performance.

### Customer Advance Payments (Anticipos) System
The system supports comprehensive advance payment tracking with automatic document numbering, integration with the unified transaction system, multi-payment method support, and a unified payment history display. It provides secure, XSS-safe PDF receipt printing and integrates advance balances into customer displays. Advance payments are restricted if a customer has pending invoices.

### Billing Interface with Customer Balance Integration
The billing interface displays real-time customer balance and intelligently handles mixed payment scenarios by applying available advances automatically. It ensures intelligent advance splitting, supports mixed payments, synchronizes customer balances, generates detailed transaction records, and provides context-aware toast notifications.

### Timezone Configuration
The system is configured to use **América/Santo_Domingo timezone (UTC-4)** for all date and time operations across backend and frontend, ensuring consistent and accurate date/time handling.

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
- **Local Database**: Uses IndexedDB (via `idb` library) for client-side data persistence
- **Stores**: Separate object stores for routes, orders, customers, products, pending actions, and sync metadata
- **Indexed Queries**: Efficient lookups by driver, date, route, customer, and sync status
- **Bulk Operations**: Optimized bulk save operations for initial data synchronization

#### Intelligent Sync Service
- **Automatic Download**: Downloads today's route data (routes, orders, customers, products) when online
- **Pending Actions Queue**: Queues all offline actions (deliveries, payments, bottle returns, status updates) with retry logic
- **Auto-Sync**: Automatically syncs pending actions every 30 seconds when connection is available
- **Connection Monitoring**: Real-time detection of online/offline status with event-driven synchronization
- **Sync Metadata**: Tracks last sync times and status for audit and debugging

#### Enhanced Service Worker
- **Multi-Cache Strategy**: Separate caches for static resources, dynamic content, and map tiles
- **Cache-First for Maps**: OpenStreetMap tiles cached with cache-first strategy for offline map viewing
- **Cache-First for Static Assets**: CSS, JS, fonts, and images served from cache for instant loading
- **Network-First for HTML**: Dynamic pages fetched from network with cache fallback
- **Offline Fallback**: Graceful degradation to cached content when offline

#### Conflict Resolution System
- **Conflict Detection**: Compares client and server timestamps to identify data conflicts
- **Smart Resolution**: Driver-authoritative strategy for deliveries/payments, server-authoritative for master data
- **Merge Logic**: Intelligent data merging that preserves critical field updates from both sources
- **Manual Resolution**: UI for resolving complex conflicts when automatic resolution isn't appropriate

#### User Experience Features
- **Visual Indicators**: Real-time online/offline status badge in mobile header
- **Sync Status Display**: Shows pending action count and last sync timestamp
- **Manual Controls**: Buttons to download data for offline use and trigger immediate sync
- **Toast Notifications**: User-friendly messages for sync progress, success, and errors
- **Airplane Mode Testing**: Full functionality verified in airplane mode for field reliability

#### Technical Implementation
- **Files**: `client/src/lib/offline-db.ts`, `client/src/lib/sync-service.ts`, `client/src/lib/conflict-resolution.ts`
- **React Hook**: `useOfflineSync` provides easy integration with React components
- **UI Component**: `OfflineSyncIndicator` shows connection status and sync controls
- **Service Worker**: Enhanced `client/public/sw.js` with v4 multi-cache architecture
- **Initialization**: Sync service is initialized in `client/src/main.tsx` at application startup to ensure offline/online event listeners are registered early

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