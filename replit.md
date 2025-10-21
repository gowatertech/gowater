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
The system automatically creates invoices when orders are marked as delivered:
-   **Trigger Condition**: Invoice creation occurs only when order status transitions from any non-delivered state to "delivered"
-   **Duplicate Prevention**: Guards prevent multiple invoice creation if status is updated repeatedly
-   **Dynamic Tax (ITBIS) Calculation**: 
    -   Tax rate is dynamically read from `company_settings.tax` (e.g., 0.18 for 18%)
    -   Subtotal is calculated by summing all order items
    -   Tax = subtotal × tax rate from company settings
    -   Total = subtotal + tax
    -   All three values (subtotal, tax, total) are stored in the invoice for transparency and auditing
-   **Data Replication**: Invoice inherits customer_id, payment_method, and date from the order
-   **Item Copying**: All order items are copied to invoice_items with their product_id, quantity, price, and total
-   **Sequential Numbering**: Invoice numbers are generated using company-specific MAX+1 logic
    -   Database constraint: UNIQUE (company_id, invoice_number) allows each company independent numbering
    -   Each company can have invoices numbered 1, 2, 3... without conflicts between companies
-   **Automatic Payment for Cash Invoices**:
    -   When payment_method is 'cash', the system automatically creates a payment record and marks the invoice as 'paid'
    -   Payment record includes invoice_id, customer_id, amount (total), and notes indicating automatic creation
    -   Applies to both manual invoice creation (POST /api/invoices) and automatic creation (from delivered orders)
    -   Error-isolated: Payment creation failures don't prevent invoice creation
-   **Error Isolation**: Invoice creation errors are logged but do not prevent order status updates
-   **Legacy Data Handling**: Frontend includes robust fallbacks (`|| "0"`) to handle invoices created before subtotal/tax fields were added
-   **Implementation**: Located in PATCH /api/orders/:orderId/status endpoint in server/routes/orders.ts and POST /api/invoices in server/routes.ts

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