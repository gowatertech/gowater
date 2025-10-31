# GoWater - Water Delivery Management System

## Overview
GoWater is a multi-tenant water delivery management system designed to optimize water distribution operations for various companies. It provides features for customer management, route optimization, inventory tracking, recurring orders, driver coordination, real-time tracking, invoicing, and commission calculations. The system aims to significantly enhance operational efficiency in the water distribution sector, offering a full-stack TypeScript application solution.

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
Utilizes modern UI components from shadcn/ui with Tailwind CSS for a clean, responsive, and accessible user experience across all devices, including mobile-first redesigns for key pages. A comprehensive user manual with intelligent search and PDF export functionality is also integrated.

### Automatic Invoice Generation & Dynamic Tax Calculation
The system automatically creates invoices when orders are marked as delivered, implementing robust concurrency control to guarantee exactly one invoice per delivered order. It handles dynamic tax calculation, data replication from orders, item copying, sequential numbering with company-specific unique constraints, and automatic payment processing for cash invoices within a single, atomic database transaction. Concurrency safety is ensured through row-level locking (`SELECT ... FOR UPDATE`), duplicate prevention mechanisms, and atomic invoice numbering using `LOCK TABLE`.

### Partial Cash Payment Handling
The mobile delivery app implements a robust partial payment system allowing drivers to accept partial cash payments. It features frontend detection of partial payments, a confirmation dialog, automatic conversion of payment method from "cash" to "credit" for outstanding balances, and backend guard rails with a 1-cent tolerance for float precision to prevent misclassification. Only actual cash amounts received are recorded as partial payments.

### Prepaid Invoice System
The system supports prepaid invoices for office payments before delivery, eliminating redundant payment collection during delivery. It detects prepaid orders across mobile and web interfaces, updates order status without creating duplicate invoices, and uses backend guards to prevent duplicate invoice creation for prepaid orders and donations.

### Unified Transaction System
The system implements a comprehensive transaction ledger tracking all financial documents (Factura, Recibo, Anticipo, CxC Inicial, Gasto, Nota Crédito, Nota Débito) with automatic creation and sequential numbering per document type. It ensures concurrency-safe numbering, automatic transaction creation, real-time customer balance calculation, multi-tenancy support, and a unified ledger for comprehensive reporting, with type-safe implementation using Zod validation.

### Customer Advance Payments (Anticipos) System
The system supports comprehensive advance payment tracking with automatic document numbering (ANT-XXXX), integration with the unified transaction system, multi-payment method support, and a unified payment history display. It provides secure, XSS-safe PDF receipt printing with custom formatting for advances and integrates advance balances into customer displays.

### Billing Interface with Customer Balance Integration
The billing interface displays real-time customer balance (saldo a favor) and intelligently handles mixed payment scenarios by applying available advances automatically. It ensures intelligent advance splitting, supports mixed payments, synchronizes customer balances (CxC), generates detailed transaction records, and provides context-aware toast notifications.

### Timezone Configuration (República Dominicana)
The system is configured to use **América/Santo_Domingo timezone (UTC-4)** for all date and time operations across backend and frontend. This is achieved through centralized date utility modules on both sides, ensuring consistent and accurate date/time handling for invoicing, payments, orders, returns, settlements, production batches, and dashboard statistics, preventing date mismatch issues.

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