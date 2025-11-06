# GoWater - Water Delivery Management System

## Overview
GoWater is a multi-tenant water delivery management system designed to optimize water distribution operations for various companies. It provides features for customer management, route optimization, inventory tracking, recurring orders, driver coordination, real-time tracking, invoicing, commission calculations, and account payment functionality. The system aims to significantly enhance operational efficiency in the water distribution sector, offering a full-stack TypeScript application solution with significant market potential in streamlining logistics and improving customer satisfaction for water delivery businesses.

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
Adheres to **WCAG 2.1** guidelines, including `aria-label` for icon-only buttons and `data-testid` for interactive elements. Features comprehensive testing coverage and a mobile-first responsive design.

### UI/UX Design Approach
Utilizes modern UI components from shadcn/ui with Tailwind CSS for a clean, responsive, and accessible user experience across all devices. A comprehensive user manual with intelligent search and PDF export functionality is also integrated.

### Invoice & Payment Systems
The system automates invoice generation upon delivery, handling dynamic tax calculation, concurrency control, and automatic payment processing for cash invoices. It supports partial cash payments via the mobile app, a prepaid invoice system to prevent redundant payment collection, and a unified transaction ledger for all financial documents. Customer balances are calculated in real-time using PostgreSQL triggers and stored in the `customers.balance` field.
The system also includes a comprehensive advance payment (anticipos) system for tracking and applying customer prepayments, restricted if pending invoices exist. The billing interface integrates customer balances and supports mixed payment scenarios.
An automated "Abono a Cuenta" (Account Payment) system allows applying a single payment across multiple pending invoices from oldest to newest, automatically creating advances for excess payments and updating invoice statuses. The account payment interface is implemented as a **dedicated full-page route** (`/payments/account-payment`) with **mobile-first responsive design** that displays the customer's actual balance from the database (not a calculated sum of pending invoices) to provide accurate financial information including all transactions. All interactive elements meet **WCAG 2.1 Level AAA touch target standards** (minimum 44px) for mobile accessibility.

### Timezone Configuration
The system is configured to use **América/Santo_Domingo timezone (UTC-4)** for all date and time operations across backend and frontend, ensuring consistent and accurate date/time handling. Dedicated RD timezone-aware utility functions are used for all date formatting.

### Payment Method Business Rules
Enforces specific payment method rules: default "Crédito", automatic "Donación" for charitable institutions, and blocks advance payments if customers have pending invoices.

### Unreturned Bottles Tracking System
Provides comprehensive tracking and visualization of unreturned returnable bottles with visual alerts, dedicated reports, real-time dashboard statistics, and an API endpoint (`/api/bottle-returns/pending`). Allows manual marking of orders as "bottles not returned".

### Offline-First Mobile Architecture
The mobile driver app implements an **offline-first architecture** with:
-   **IndexedDB Persistent Storage**: For client-side data persistence (routes, orders, customers, products, pending actions).
-   **Intelligent Sync Service**: Automatically downloads route data when online, queues offline actions with retry logic, auto-syncs every 30 seconds when connected, and monitors connection status.
-   **Enhanced Service Worker**: Multi-cache strategy for static resources, dynamic content, and map tiles (cache-first for maps/static, network-first for HTML, offline fallback).
-   **Conflict Resolution System**: Detects and resolves data conflicts using timestamps, with driver-authoritative strategy for deliveries/payments and server-authoritative for master data.
-   **User Experience Features**: Visual online/offline indicators, sync status, manual sync controls, and toast notifications.

### Daily Cash Reconciliation System
The system includes a comprehensive **daily cash reconciliation module** (`/cash-reconciliation`) for end-of-day financial management:
-   **Automatic Sales Summary**: Displays total sales, credit vs. cash invoices, and all payment types (RI, ANT) with real-time calculations from the day's transactions.
-   **Manual Input Fields**: Accepts initial cash, actual cash counted, and lost water gallons (integer format, informative only).
-   **Automatic Calculations**: Uses formula **Efectivo Caja - (Inicial + FT Cash + ANT)** to calculate surplus/shortage. If result = 0: balanced, > 0: surplus (green badge), < 0: shortage (red badge).
-   **Lost Water Field**: Integer-only format (no decimals), displayed as informational field only and NOT included in reconciliation calculations.
-   **One Per Day Validation**: Enforces business rule allowing only one reconciliation per day, displaying existing reconciliation details if duplicate attempt is made.
-   **Historical Records**: Maintains queryable history of all reconciliations with detailed view dialogs showing complete financial breakdown, notes, and audit information.
-   **Modern UI**: Tabbed interface ("Nuevo Cuadre" and "Historial") with icons from lucide-react, responsive design, and accessible from billing module via dedicated "Cuadre de Caja" button.
-   **Multi-tenant Support**: All reconciliations are isolated by company using the standard companyId mechanism.

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