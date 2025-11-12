# GoWater - Water Delivery Management System

## Overview
GoWater is a multi-tenant water delivery management system designed to optimize water distribution for various companies. It offers features for customer management, route optimization, inventory tracking, recurring orders, driver coordination, real-time tracking, invoicing, commission calculations, and account payment functionality. The system aims to significantly enhance operational efficiency in the water distribution sector, providing a full-stack TypeScript application solution. It provides capabilities for managing unreturned bottles and a comprehensive daily cash reconciliation system.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Multi-Tenancy
The system uses a **shared database, shared schema** multi-tenancy model, isolating data per company using `company_id` and `AsyncLocalStorage`.

### Authentication & Authorization
**Passport.js Local Strategy** with bcrypt handles authentication, supporting distinct user types (Platform and Company users) and implementing **Role-Based Access Control (RBAC)**.

### Database Architecture
**Drizzle ORM** with **PostgreSQL** provides type-safe queries, migrations, soft deletes, audit fields, composite keys, and denormalization.

### Frontend Architecture
Built with **React 18** and TypeScript, it uses **Wouter** for routing, **TanStack Query** for server state, and **React Hook Form + Zod** for validation. The UI utilizes **shadcn/ui + Tailwind CSS**, follows a **mobile-first design**, and is configured as a **Progressive Web App (PWA)**. The mobile driver app features an **offline-first architecture** with **IndexedDB Persistent Storage**, an **Intelligent Sync Service**, an **Enhanced Service Worker**, and a **Conflict Resolution System**.

### Backend Architecture
Provides **RESTful API endpoints** with modular routing. Key services include a **Route Optimization Service** (using Turf.js), a **Recurring Orders Service**, and a **Storage Service**.

### Real-Time Features
**WebSockets** facilitate real-time driver location tracking and route status updates.

### Geographic Data Management
A **hierarchical address system** integrates with **Leaflet Maps** for interactive route planning and visualization.

### File Upload Handling
**Multer Middleware** manages in-memory file uploads with a 5MB limit.

### PDF Generation
**HTML-to-Canvas** (html2canvas + jsPDF) is used for complex PDF layouts, and **Direct jsPDF Generation** for simpler documents.

### Internationalization (i18n)
**react-i18next** supports multilingualism (English and Spanish).

### Accessibility & Testing Standards
Adheres to **WCAG 2.1** guidelines and features comprehensive testing coverage.

### UI/UX Design Approach
Utilizes modern UI components from shadcn/ui with Tailwind CSS for a clean, responsive, and accessible user experience. The system also includes responsive layouts for mobile devices, such as the Customer Transaction History.

### Invoice & Payment Systems
Automates invoice generation, handles dynamic tax calculation, concurrency control, automatic payment processing for cash invoices, partial cash payments via mobile app, and a prepaid invoice system. It includes a unified transaction ledger, a comprehensive advance payment (anticipos) system, and an automated "Abono a Cuenta" (Account Payment) system that allows applying payments across multiple pending invoices and creating advance payments even without pending invoices. A centralized `recalculateInvoiceStatus()` utility ensures accurate invoice status based on persisted payment data. The system also includes automatic synchronization of `customers.balance` with transactions and allows for advance payments without pending invoices.

### Timezone Configuration
The system uses **América/Santo_Domingo timezone (UTC-4)** for all date and time operations.

### Payment Method Business Rules
Enforces specific payment method rules, including default "Crédito", automatic "Donación" for charity, and restrictions on advance payments.

### Unreturned Bottles Tracking System
Provides tracking and visualization of unreturned bottles with alerts, reports, and real-time dashboard statistics.

### Daily Cash Reconciliation System
A comprehensive **daily cash reconciliation module** (`/cash-reconciliation`) provides automatic sales summaries, manual input fields, automatic calculations of surplus/shortage, one-per-day validation, historical records, edit mode, print/PDF functionality, and a modern UI.

### Daily Commission System
Implemented a comprehensive daily commission system for delivery personnel based on commissionable products. This includes database fields for `users.hasCommission`, `orders.salespersonId`, and product-specific commission values (`isCommissionable`, `driverCommissionValue`, `helperCommissionValue`). Commissions are calculated in real-time from delivered orders, aggregated daily, and controlled at the user level. The system features a redesigned commissions dashboard with quick filters, custom date ranges, advanced filters, summary statistics, visual analytics, and a detailed daily breakdown. Salesperson visibility and editing are integrated into order management views to support commission tracking.

## External Dependencies
### Core Infrastructure
-   **PostgreSQL Database**

### Third-Party Services
#### Map & Geolocation
-   **Leaflet.js**: Interactive map rendering.
-   **Turf.js**: Advanced geospatial analysis.
-   **OpenStreetMap tiles**: Map data.

#### Email Service
-   **Resend API**: Email notifications.

#### Payment Processing
-   **Stripe Integration**: Membership billing.

#### UI Component Libraries
-   **Radix UI**: Accessible component primitives.
-   **Lucide React**: Icon system.
-   **shadcn/ui**: Customizable UI components.