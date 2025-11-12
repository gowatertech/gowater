# GoWater - Water Delivery Management System

## Overview
GoWater is a multi-tenant water delivery management system designed to optimize water distribution for various companies. It offers features for customer management, route optimization, inventory tracking, recurring orders, driver coordination, real-time tracking, invoicing, commission calculations, and account payment functionality. The system aims to significantly enhance operational efficiency in the water distribution sector, providing a full-stack TypeScript application solution.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Multi-Tenancy Design
The system uses a **shared database, shared schema** multi-tenancy model, isolating data per company using `company_id` and `AsyncLocalStorage`.

### Authentication & Authorization
**Passport.js Local Strategy** with bcrypt handles authentication, supporting distinct user types (Platform and Company users) and implementing **Role-Based Access Control (RBAC)**.

### Database Architecture
**Drizzle ORM** with **PostgreSQL** provides type-safe queries, migrations, soft deletes, audit fields, composite keys, and denormalization.

### Frontend Architecture
Built with **React 18** and TypeScript, it uses **Wouter** for routing, **TanStack Query** for server state, and **React Hook Form + Zod** for validation. The UI utilizes **shadcn/ui + Tailwind CSS**, follows a **mobile-first design**, and is configured as a **Progressive Web App (PWA)**.

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
Automates invoice generation, handles dynamic tax calculation, concurrency control, automatic payment processing for cash invoices, partial cash payments via mobile app, and a prepaid invoice system. It includes a unified transaction ledger and a comprehensive advance payment (anticipos) system. An automated "Abono a Cuenta" (Account Payment) system allows applying payments across multiple pending invoices.

### Timezone Configuration
The system uses **América/Santo_Domingo timezone (UTC-4)** for all date and time operations.

### Payment Method Business Rules
Enforces specific payment method rules, including default "Crédito", automatic "Donación" for charity, and restrictions on advance payments.

### Unreturned Bottles Tracking System
Provides tracking and visualization of unreturned bottles with alerts, reports, and real-time dashboard statistics.

### Offline-First Mobile Architecture
The mobile driver app implements an **offline-first architecture** with **IndexedDB Persistent Storage**, an **Intelligent Sync Service**, an **Enhanced Service Worker** (multi-cache strategy), and a **Conflict Resolution System**.

### Daily Cash Reconciliation System
A comprehensive **daily cash reconciliation module** (`/cash-reconciliation`) provides automatic sales summaries, manual input fields, automatic calculations of surplus/shortage, one-per-day validation, historical records, edit mode, print/PDF functionality, and a modern UI.

## Recent Changes

### November 12, 2025 - Critical Fix: Invoice Status Calculation Bug

#### Centralized Invoice Status Recalculation System
Fixed critical bug where invoices were incorrectly marked as "paid" after receiving partial payments:

-   **Root Cause**: Multiple code locations were using in-memory arithmetic to calculate invoice balance and update status, without verifying the actual persisted payment total in the database. This caused invoices to be marked "paid" prematurely when partial payments were recorded.

-   **Solution**: Created centralized `recalculateInvoiceStatus()` utility function in `server/utils/invoice-status.ts` that:
    1. Fetches the actual invoice total and sum of payments **directly from the database**
    2. Calculates remaining balance using persisted data only
    3. Uses tolerance threshold (0.01) for decimal rounding comparison
    4. Only updates status to "paid" if balance ≤ 0.01
    5. Includes detailed logging for debugging

-   **Code Changes**: Replaced 5 critical locations where invoice status was incorrectly calculated:
    1. `server/routes.ts` (~line 5084): Web account payment endpoint `/api/payments/account-payment`
    2. `server/routes/mobile-api.ts` (~line 1194): Mobile account payment endpoint `/api/mobile/payments/account-payment`
    3. `server/storage.ts` (~line 862): `registerPayment()` function (critical - was marking ALL invoices as paid)
    4. `server/storage.ts` (~line 1209): `applyAdvancePaymentsToInvoice()` function
    5. `server/routes.ts` (~line 4767): Single payment endpoint

-   **Design Pattern**: All invoice status updates must now use `recalculateInvoiceStatus(invoiceId, companyId)` to ensure consistency and prevent premature "paid" status.

-   **Database Validation**: SQL diagnostic query confirmed no existing invoices are incorrectly marked as "paid" in the current database.

-   **Impact**: Invoices now maintain accurate status based on actual payment balance, preventing accounting discrepancies and ensuring reliable financial reporting.

### November 12, 2025 - Dedicated Mobile Account Payment Page

#### Mobile-Specific "Abono a Cuenta" Implementation
Created a dedicated mobile version of the account payment functionality to maintain consistent mobile UX:
-   **New Mobile Page**: Created `/mobile-app/payments/abono-cuenta.tsx` with full account payment functionality optimized for mobile devices.
-   **Mobile UI Components**: Integrated MobileHeader (with back button) and MobileFooter for consistent mobile navigation experience.
-   **Touch-Optimized Design**: Adjusted spacing, padding, and button sizes (min-h-[44px]) for better touch interaction.
-   **Mobile API Endpoints**: Created two new backend endpoints in `server/routes/mobile-api.ts`:
    1. `GET /api/mobile/customers/:id/pending-invoices` - Returns customer balance and pending invoices
    2. `POST /api/mobile/payments/account-payment` - Processes payment with automatic distribution
-   **Navigation Flow**: Maintains mobile context throughout the flow (mobile clientes → mobile account payment → back to mobile clientes).
-   **URL Preselection**: Preserves customer preselection via `?customerId=X` parameter with ref-based guard against refetch interference.
-   **Null-Safe Filtering**: Customer search handles null values in managername and phone fields (`?? ""` guards).
-   **Cache Management**: Invalidates mobile-specific query keys (`/api/mobile/customers`, `/api/mobile/payments`) for real-time updates.
-   **Functional Parity**: Backend logic mirrors web version exactly, handling invoice distribution, advance creation, CXC direct payments, and transaction ledger entries.
-   **Impact**: Drivers can now make account payments without breaking out of the mobile experience, improving workflow consistency and reducing navigation friction.

### November 11, 2025 - Mobile Clientes UI Simplification with Account Payment Integration

#### Simplified Customer Balance View
Streamlined the mobile clientes detail view for improved user experience:
-   **UI Simplification**: Replaced the detailed CustomerBalance component with a clean Card showing current balance and a direct action button.
-   **New Feature**: Added "Abono a Cuenta" button that navigates to the mobile account payment page (`/mobile-app/payments/abono-cuenta`) with customer preselected.
-   **Better UX**: Reduced cognitive load by eliminating the detailed transaction history from the modal, focusing on the most common action (making payments).
-   **Impact**: Drivers can now quickly access the payment functionality for any customer with fewer taps and less visual clutter.

### November 11, 2025 - Mobile Order Editing and List Synchronization

#### Total Update After Editing Products
Fixed issue where edited order totals were not reflecting in the UI after saving changes:
-   **Root Cause**: The `saveProductChanges` function was manually updating local state instead of reloading data from the server, causing the displayed total to remain stale even though the database was correctly updated.
-   **Solution**: Modified `saveProductChanges` to call `loadDeliveryDetails()` after successfully saving changes, ensuring all order data (including the recalculated total) is refreshed from the server.
-   **Impact**: Order totals now update immediately and accurately after editing products, maintaining data consistency between frontend and backend.

#### Product Deletion in Edit Mode
Added functionality to remove products from orders during editing:
-   **Zero-Quantity Filtering**: Products with quantity 0 are automatically filtered out before sending to the server, preventing invalid order states.
-   **Delete Button**: Added explicit delete button (trash icon) for each product in edit mode, providing clear visual affordance for product removal.
-   **Validation**: Added validation to ensure at least one product with quantity > 0 remains in the order before saving.
-   **Impact**: Users can now remove unwanted products from orders either by setting quantity to 0 or clicking the delete button, improving order editing flexibility.

#### Cache Invalidation for Delivery List
Fixed issue where the delivery list showed outdated totals and statuses after editing or completing deliveries:
-   **Root Cause**: TanStack Query cache for the delivery list (`/api/mobile/deliveries`) was not being invalidated after making changes to individual deliveries, causing stale data to persist when navigating back to the list.
-   **Solution**: Added `queryClient.invalidateQueries({ queryKey: ["/api/mobile/deliveries"] })` after three critical operations:
    1. Saving product changes (`saveProductChanges`)
    2. Completing delivery with invoicing (`executeDeliveryProcess`)
    3. Completing prepaid delivery (`executeDeliveryProcessPrepaid`)
-   **Impact**: The delivery list now always shows current totals and statuses immediately after any changes, eliminating the need for manual refresh and providing accurate real-time data.

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