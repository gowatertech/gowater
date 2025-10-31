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
The system supports prepaid invoices for office payments before delivery, eliminating redundant payment collection during delivery. It features:
- **Office Workflow**: Staff can create prepaid invoices via "Pagar" button in orders list
- **Mobile Delivery App Detection** (/mobile-app/entregas): Detects prepaid orders via `invoice_id` field, displays green "✓ PAGADO" badge, simplifies delivery confirmation (no payment fields)
- **Mobile Route App Detection** (/mobile-app/ruta): Shows green "PAGADO" badge in route deliveries, displays informational message, hides payment fields, changes dialog title to "Confirmar Entrega"
- **Web Interface Detection**: Order details page shows green "PAGADO" badge and informational message when order is prepaid
- **Status Update Protection**: Mobile delivery, mobile route, and web interfaces update order status without creating duplicate invoices
- **Backend Guards**: POST /api/update-order-status and PATCH /api/orders/:id/status prevent duplicate invoice creation for prepaid orders and donations
- **Database Integration**: Uses `orders.invoice_id` foreign key to link prepaid invoices, ensuring referential integrity

### Customer Advance Payments (Anticipos) System
The system supports comprehensive advance payment tracking with secure documentation generation. It features:
- **Automatic Document Numbering**: Sequential document numbers in ANT-XXXX format (e.g., ANT-0001, ANT-0002) auto-generated for all advance payments
- **Multi-Payment Method Support**: Accepts advances via cash, card, credit, and transfer methods
- **Payment History Integration**: Unified payment history page displays both regular payments and advances with visual badges (green "ANTICIPO" badge for advances)
- **Advanced Filtering**: Filter payments by type (advance/regular), method, date range, and customer
- **Secure Receipt Printing**: Uses centralized `PrinterService.generatePDFDirect()` for XSS-safe PDF generation
  - Automatic detection of advance payments via `isAdvance` flag or `documentNumber` prefix
  - Custom receipt formatting for advances: "RECIBO DE ANTICIPO" title, green "PAGO ANTICIPADO" badge
  - Shows document number (ANT-XXXX) for advances vs invoice number for regular payments
  - Includes informational note: "Este anticipo será aplicado a futuras compras del cliente"
- **Database Schema**: `payments.documentNumber` column stores advance document numbers, `payments.isAdvance` boolean flag identifies advance payments
- **Customer Balance Display**: CustomerBalance component shows advance balance with ability to register and print advances
- **Print Integration**: Print buttons in payment history table view, responsive card view, and detail dialogs

### Billing Interface with Customer Balance Integration
The billing interface displays real-time customer balance (saldo a favor) and intelligently handles mixed payment scenarios:
- **Real-Time Balance Display**: Shows customer's available advance balance when selected in billing interface
- **Smart Payment Method Handling**:
  - **Full Coverage**: When balance ≥ invoice total, payment methods are hidden and replaced with a confirmation message
  - **Partial Coverage**: When 0 < balance < invoice total, displays warning showing balance to be applied and remaining amount to pay
  - **No Balance**: Standard payment method selection when customer has no advances
- **Automatic Advance Application**: Backend automatically applies available advances to all invoices regardless of payment method
- **Intelligent Advance Splitting**: When advance amount exceeds invoice total:
  - Creates new payment record with exact amount needed for invoice
  - Updates original advance with remaining balance for future use
  - Prevents loss of excess advance funds
- **Mixed Payment Support**: For cash invoices with partial balance coverage, creates payment record for remaining amount after applying advances
- **Customer Balance (CxC) Synchronization**:
  - Registering advance: `balance -= advance` (customer deposits money)
  - Applying advance to invoice: `balance += advance` (reverses the credit since advance was used)
  - Creating credit invoice: `balance += pending_amount` (customer owes money)
  - System ensures balance field always reflects accurate accounts receivable
- **Transaction Records**: All payment flows generate detailed transaction records with automatic note generation
- **Success Messages**: Context-aware toast notifications indicate balance applied, mixed payments, or full advance coverage

### Timezone Configuration (República Dominicana)
The system is configured to use **América/Santo_Domingo timezone (UTC-4)** for all date and time operations across backend and frontend:

#### Backend Timezone Handling
- **Date Utilities Module** (`server/date-utils.ts`): Centralized date handling functions ensure consistency
  - `getNowRD()`: Returns current date/time in República Dominicana timezone
  - `getTimestampRD()`: Returns ISO timestamp formatted for PostgreSQL in RD timezone
  - `getTodayRD()`: Returns today's date at 00:00:00 in RD timezone
  - `toRD(date)`: Converts any date to RD timezone
- **Backend Implementation**:
  - Invoice Creation (`server/routes.ts`): Uses `getTimestampRD()` for accurate invoice dates
  - Payment Processing (`server/routes.ts`, `server/storage.ts`): Uses `getNowRD()` for payment timestamps
  - Order Creation (`server/routes/orders.ts`): Uses `getTimestampRD()` for order dates
  - Bottle Returns (`server/routes/orders.ts`): Uses `getTimestampRD()` for return dates
  - Route Settlements (`server/routes/routeSettlements.ts`): Uses `getTimestampRD()` for settlement dates
  - Production Batches (`server/routes.ts`): Uses `getNowRD()` for production timestamps
- **Dashboard Statistics**: All date-based queries (daily sales, weekly trends, monthly reports) use PostgreSQL's `CURRENT_DATE` which respects the database's UTC-4 timezone

#### Frontend/Mobile App Timezone Handling
- **Date Utilities Module** (`client/src/lib/date-utils.ts`): Frontend equivalent with matching timezone functions
  - `getNowRD()`: Returns current date/time in RD timezone for client-side operations
  - `getTimestampRD()`: Returns ISO timestamp in RD timezone for server submissions
  - `getTodayRD()`: Returns today's date at 00:00:00 in RD timezone
  - `getTodayStringRD()`: Returns today's date in YYYY-MM-DD format for date inputs
  - `formatDateRD()`: Formats dates in Spanish (República Dominicana locale)
  - `toRD(date)`: Converts any date to RD timezone
- **Mobile App Implementation**:
  - Bottle Returns (`client/src/pages/mobile-app/entregas/[id].tsx`): Uses `getTimestampRD()` when submitting return dates
  - New Order Creation (`client/src/pages/mobile-app/new-order/index.tsx`): Uses `getTodayStringRD()` for order dates
- **Benefits**: Prevents date mismatch issues where UTC timestamps would show future dates, ensures accurate daily sales reporting across all devices and time zones, and maintains consistency across all temporal data in both backend and frontend

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