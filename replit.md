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
Utilizes modern UI components from shadcn/ui with Tailwind CSS for a clean, responsive, and accessible user experience.

### Invoice & Payment Systems
Automates invoice generation, handles dynamic tax calculation, concurrency control, automatic payment processing for cash invoices, partial cash payments via mobile app, and a prepaid invoice system. It includes a unified transaction ledger, a comprehensive advance payment (anticipos) system, and an automated "Abono a Cuenta" (Account Payment) system that allows applying payments across multiple pending invoices and creating advance payments even without pending invoices. A centralized `recalculateInvoiceStatus()` utility ensures accurate invoice status based on persisted payment data.

### Timezone Configuration
The system uses **América/Santo_Domingo timezone (UTC-4)** for all date and time operations.

### Payment Method Business Rules
Enforces specific payment method rules, including default "Crédito", automatic "Donación" for charity, and restrictions on advance payments.

### Unreturned Bottles Tracking System
Provides tracking and visualization of unreturned bottles with alerts, reports, and real-time dashboard statistics.

### Daily Cash Reconciliation System
A comprehensive **daily cash reconciliation module** (`/cash-reconciliation`) provides automatic sales summaries, manual input fields, automatic calculations of surplus/shortage, one-per-day validation, historical records, edit mode, print/PDF functionality, and a modern UI.

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

## Recent Changes

### November 12, 2025 - Daily Commission System Implementation

#### Commission Control & Tracking
Implemented a comprehensive daily commission system for delivery personnel based on commissionable products:

**Database Schema Changes:**
-   **users.hasCommission**: Boolean field to control which users (drivers/helpers) receive commissions
-   **orders.salespersonId**: Tracks the responsible delivery person for commission assignment
-   **commissions table**: Converted from weekly to daily tracking (using `date` field instead of `weekStartDate/weekEndDate`)
-   **products commission fields**:
    - `isCommissionable`: Boolean to mark commissionable products
    - `driverCommissionValue`: Commission amount for drivers (RD$)
    - `helperCommissionValue`: Commission amount for helpers (RD$)

**Business Logic:**
-   **Automatic salesperson assignment**: Orders automatically assign `salespersonId` based on:
    1. Route driver (if order has a route)
    2. Manually selected salesperson (for admin-created orders)
    3. Logged-in user (for individual orders created by drivers/helpers)
-   **Commission calculation**: Only products marked as `isCommissionable` generate commissions
-   **Role-based commission values**: Different commission amounts for drivers vs helpers
-   **User-level commission control**: `hasCommission` toggle enables/disables commission for individual users
-   **Daily aggregation**: Commissions grouped by (userId, date) with real-time calculation from delivered orders

**User Interfaces:**
-   **User Management** (`/users`): Added "Aplica Comisión" checkbox for drivers and helpers
-   **Order Creation** (`/orders/new`): Added "Responsable de Entrega" selector for administrative users to manually assign delivery person
-   **Product Management** (`/inventory`): Added "Configuración de Comisiones" section with:
    - "Es Comisionable" checkbox
    - "Comisión Chofer" and "Comisión Ayudante" input fields (disabled when product is not commissionable)
-   **Commissions Dashboard** (`/commissions`): Complete redesign with daily model featuring:
    - **Quick Filter Tabs**: "Hoy", "Esta Semana", "Este Mes" for rapid date range selection
    - **Custom Date Range**: Dual DatePicker for precise from/to date selection
    - **Advanced Filters**: Filter by specific user or role (Choferes/Ayudantes)
    - **Summary Statistics**: 4 gradient cards showing Total Choferes, Total Ayudantes, Total General, and Productos Vendidos
    - **Visual Analytics**: Bar chart displaying daily commission distribution across selected date range
    - **Detailed View**: Responsive table (desktop) / cards (mobile) showing per-user-per-day commission breakdown
    - **Clear Filters**: One-click button to reset user and role filters
    - **Real-time Calculation**: Displays calculated commissions from delivered orders before official payment

**API Enhancements:**
-   **GET /api/commissions**: Accepts `startDate`, `endDate`, `userId` (optional), `userRole` (optional) query parameters
-   Returns array of daily commission records with status indicators (calculated/pending/paid/cancelled)
-   Efficient date-range queries with user and role filtering

**Testing:**
-   End-to-end testing verified complete UI functionality including filters, charts, and data display
-   Architect-reviewed commission calculation logic and dashboard implementation
-   Confirmed responsive design works on both desktop and mobile viewports

**Impact**: The system now supports flexible daily commission tracking for delivery personnel, with product-level commission values and user-level commission control, replacing the previous weekly commission model. The new dashboard provides comprehensive analytics and filtering capabilities for management oversight.

### November 12, 2025 - Enhanced Order Views: Salesperson Display and Editing

#### Complete Salesperson Visibility Across Order Management
Extended the order management interface to display and edit the responsible delivery person (salesperson) throughout the order lifecycle:

-   **Backend API Enhancement (GET /api/orders/:id)**:
    - Added LEFT JOIN to users table to retrieve `salespersonId` and `salespersonName`
    - Ensures backwards compatibility by handling null values for orders without assigned salesperson
-   **Backend API Enhancement (PUT /api/orders/:id)**:
    - Added `salesperson_id` to the UPDATE query to persist salesperson changes
    - Supports updating salesperson assignment when editing existing orders
-   **Order Details View**:
    - Added "Responsable de Entrega" field displaying salesperson name or "Sin asignar"
    - Provides visibility into who is responsible for each order's delivery
-   **Order Edit View**:
    - Added "Responsable de Entrega" dropdown selector
    - Populates with all users having driver or helper roles
    - Loads existing salesperson from order data
    - Sends salespersonId in update mutation to persist changes
    - Supports "unassigned" state for orders without a designated salesperson
-   **Testing**: Architect-verified end-to-end data flow (GET→display, edit→PUT→persist)

**Impact**: Users can now view and modify the delivery person responsible for each order directly in the order details and edit interfaces, providing complete visibility and control over salesperson assignments. This complements the automatic assignment logic in order creation and supports commission tracking requirements.

### November 12, 2025 - Responsive Customer Transaction History

#### Mobile-Friendly Transaction Display
Implemented responsive design for the CustomerTransactionHistory component to improve usability on mobile devices:

-   **Responsive Layout**: Uses `useIsMobile()` hook to detect viewport width and switch between layouts
-   **Mobile View (< 768px)**: Displays transactions as compact cards with:
    - First line: Document number, type badge, and date
    - Second line: Transaction description (truncated at 2 lines)
    - Third section: Grid showing Débito, Crédito, and Balance
-   **Desktop View (≥ 768px)**: Maintains original table layout with 7 columns
-   **Visual Consistency**: Preserved color coding (red for débitos, green for créditos) and iconography across both views
-   **Testing**: Successfully tested on both mobile (375x667) and desktop (1280x720) viewports
-   **Impact**: Customers can now easily view their transaction history on mobile devices without horizontal scrolling, improving the mobile experience significantly.

### November 12, 2025 - Enhanced Account Payment: Allow Advance Payments Without Pending Invoices

#### Enable Anticipos for All Customers
Modified the account payment (Abono a Cuenta) feature to allow creating advance payments (anticipos) even when customers have no pending invoices or zero balance:

-   **Web & Mobile Consistency**: Updated both web (`client/src/pages/payments/account-payment.tsx`) and mobile (`client/src/pages/mobile-app/payments/abono-cuenta.tsx`) versions to support this functionality.
-   **Removed Restrictions**: 
    1. Eliminated `pendingInvoices.length === 0` check from `paymentPreview` useMemo
    2. Removed conditional hiding of "Detalles del Pago" section based on invoice/balance status
-   **Clear User Messaging**: 
    - For customers with balance 0 and no invoices: "Cliente al día - Puede crear un anticipo que se aplicará automáticamente a sus futuras facturas"
    - For customers with balance > 0 but no invoices: "Puede aplicar un pago directamente al balance o crear un anticipo"
-   **Backend Support**: The existing backend endpoint already handled advance payment creation correctly when no invoices absorb the full payment amount.
-   **Testing**: Successfully tested creating advance payment (ANT-002) for RD$ 50.00 for customer "Clínica Dr Jacobo" with zero balance and no pending invoices.
-   **Impact**: Sales teams and drivers can now accept payments from any customer at any time, even if they don't currently owe money. These anticipos automatically apply to future invoices, improving cash flow and customer service flexibility.