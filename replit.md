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
Utilizes modern UI components from shadcn/ui with Tailwind CSS for a clean, responsive, and accessible user experience across all devices, including mobile-first redesigns for key pages like Users, Customers, Bottle Returns, Routes, Vehicle Loading, and Recurring Orders. A comprehensive user manual with intelligent search and PDF export functionality is also integrated.

### Dashboard Commission Widget
The dashboard features a real-time commission tracking widget that displays current week earnings (Monday-Sunday) for drivers and helpers. Key improvements include:
-   **Always-Visible Design**: Widget renders even when data is loading or unavailable, showing default values (RD$0.00)
-   **Robust Error Handling**: Enhanced queryClient with JSON parsing error handling and empty response detection
-   **Guaranteed JSON Responses**: Backend endpoint always returns valid JSON with explicit Content-Type headers and numeric type coercion
-   **Real-Time Updates**: Automatically refreshes every 30 seconds with commission totals
-   **Visual Feedback**: Gradient-styled cards for drivers (blue), helpers (green), and total (purple) earnings

### Automatic Invoice Generation & Dynamic Tax Calculation
The system automatically creates invoices when orders are marked as delivered, implementing robust concurrency control to guarantee exactly one invoice per delivered order:

**Core Functionality:**
-   **Trigger Condition**: Invoice creation occurs only when order status transitions from any non-delivered state to "delivered"
-   **Dynamic Tax (ITBIS) Calculation**: 
    -   Tax rate is dynamically read from `company_settings.tax` (e.g., 0.18 for 18%)
    -   Subtotal is calculated by summing all order items
    -   Tax = subtotal × tax rate from company settings
    -   Total = subtotal + tax
    -   All three values (subtotal, tax, total) are stored in the invoice for transparency and auditing
-   **Data Replication**: Invoice inherits customer_id, payment_method, and date from the order
-   **Item Copying**: All order items are copied to invoice_items with their product_id, quantity, price, and total
-   **Sequential Numbering**: Invoice numbers are generated using company-specific MAX+1 logic within a transaction
    -   Database constraint: UNIQUE (company_id, invoice_number) allows each company independent numbering
    -   Each company can have invoices numbered 1, 2, 3... without conflicts between companies
-   **Automatic Payment for Cash Invoices**:
    -   When payment_method is 'cash', the system automatically creates a payment record and marks the invoice as 'paid'
    -   Payment record includes invoice_id, customer_id, amount (total), and notes: "Pago automático en efectivo - Factura #[invoice_number] - Pedido #[order_id]"
    -   For credit/transfer payment methods, invoice status is set to 'pending' without creating a payment record
    -   All operations are part of the same atomic transaction

**Concurrency Safety (Production-Ready):**
-   **Database Transactions**: All operations (order update, invoice creation, item copying, payment creation) are wrapped in a single BEGIN/COMMIT/ROLLBACK transaction for atomicity
-   **Row-Level Locking**: Uses `SELECT ... FOR UPDATE` to lock the order row before reading its status, ensuring the previous status is captured atomically
-   **Duplicate Prevention**: 
    -   Early exit if order is already delivered (prevents double invoice creation)
    -   Checks for existing invoice using exact note matching: `notes = 'Factura generada automáticamente para pedido #[order_id]'`
    -   If duplicate found, commits transaction without creating new invoice
-   **Atomic Invoice Numbering**: 
    -   Uses `LOCK TABLE invoices IN EXCLUSIVE MODE` within the transaction to serialize invoice number generation
    -   Prevents concurrent requests from generating duplicate invoice numbers
    -   Note: Table-wide lock may throttle throughput under high load; future optimization could use per-company sequences
-   **Rollback on Error**: Any error during the process triggers automatic rollback, ensuring no partial data is committed

**Implementation Details:**
-   **Primary Endpoint**: POST /api/update-order-status in server/routes/update-order-status.ts
-   **Transaction Flow**:
    1. BEGIN transaction and acquire database client from connection pool
    2. SELECT ... FOR UPDATE to lock order and capture previous status atomically
    3. Verify order not already delivered (exit early if so)
    4. UPDATE order status to "delivered"
    5. Check for existing invoice (exact note match)
    6. Calculate subtotal, tax, and total from order items
    7. LOCK TABLE invoices to serialize numbering
    8. Generate next invoice number using MAX() + 1
    9. INSERT new invoice record
    10. INSERT all invoice items (copying from order items)
    11. If cash: INSERT automatic payment record
    12. COMMIT transaction (or ROLLBACK on any error)
-   **Legacy Data Handling**: Frontend includes robust fallbacks (`|| "0"`) to handle invoices created before subtotal/tax fields were added
-   **Known Limitations**: Table-wide EXCLUSIVE lock for invoice numbering may impact performance under high concurrent load; recommended future optimization is per-company sequence or GENERATED BY IDENTITY column

### Partial Cash Payment Handling
The mobile delivery app implements a robust partial payment system that allows drivers to accept partial cash payments when customers cannot pay the full amount. This feature ensures accurate accounting while maintaining excellent user experience:

**Core Functionality:**
-   **Frontend Detection**: When a driver enters a cash amount less than the order total (including $0), the app automatically detects this as a partial payment
-   **Confirmation Dialog**: A clear confirmation dialog shows:
    -   Total amount of the order
    -   Amount the driver is receiving
    -   Amount that will remain pending
-   **Automatic Conversion**: Upon confirmation, the payment method is converted from "cash" to "credit" to create a credit invoice
-   **Partial Payment Recording**: The system creates a credit invoice (status: "pending") and records the actual cash amount received as a partial payment

**Backend Safety (Production-Ready):**
-   **Guard Rail**: Independent server-side validation prevents accidental misclassification
    -   If a payment comes as "cash" but amount is insufficient, the backend automatically forces it to "credit"
    -   Uses 1-cent tolerance (`TOLERANCE = 0.01`) to handle floating-point precision issues
    -   Logic: `isInsufficientPayment = amountReceived < (orderTotal - 0.01)`
-   **Float Precision Handling**: Correctly handles edge cases:
    -   Exact payments with float rounding (e.g., $19.99 → $19.989999) are treated as full payments
    -   Small overpayments (e.g., $20.00 for $19.99) are processed normally as cash
    -   True partial payments (e.g., $500 for $1000) are correctly converted to credit
-   **Payment Recording**: Only creates payment records when `amountPaid > 0`, with detailed notes for tracking

**Flow Examples:**
1. **Full Cash Payment** ($1000 for $1000 order):
   - No confirmation dialog shown
   - Creates invoice with status "paid"
   - Records full cash payment
   
2. **Partial Cash Payment** ($500 for $1000 order):
   - Shows confirmation dialog: "You're receiving $500, $500 will remain pending"
   - Creates credit invoice with status "pending"
   - Records $500 cash payment
   - Remaining $500 balance can be collected later
   
3. **Zero Cash Payment** ($0 for $1000 order):
   - Shows confirmation dialog: "The full $1000 will remain pending"
   - Creates credit invoice with status "pending"
   - No payment record created
   - Full amount remains pending for future collection

**Implementation:**
-   **Frontend**: `client/src/pages/mobile-app/entregas/[id].tsx` - Handles detection, confirmation, and conversion
-   **Backend**: `server/routes/mobile-api.ts` - POST `/api/mobile/orders/:id/deliver-and-invoice` with guard rail validation

## External Dependencies

### Core Infrastructure
-   **PostgreSQL Database**

### Third-Party Services

#### Map & Geolocation
-   **Leaflet.js**: Interactive map rendering.
-   **Turf.js**: Advanced geospatial analysis.
-   **OpenStreetMap tiles**: Map data.

#### Email Service
-   **Resend API**: Powers email notifications for contact and lead forms (recipient: gowatertech@gmail.com).

#### Payment Processing
-   **Stripe Integration**: For membership billing.

#### UI Component Libraries
-   **Radix UI**: Accessible component primitives.
-   **Lucide React**: Icon system.
-   **shadcn/ui**: Customizable UI components.