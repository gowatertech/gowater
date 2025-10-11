# GoWater - Water Delivery Management System

## Overview

GoWater is a comprehensive multi-tenant water delivery management system designed to streamline water distribution operations. It supports multiple independent companies, offering features such as customer management, route optimization, inventory tracking, recurring orders, driver coordination, real-time location tracking, invoicing, and commission calculations. The system aims to enhance operational efficiency for businesses in the water distribution sector, built as a full-stack TypeScript application with a React frontend, Express backend, PostgreSQL, and Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Multi-Tenancy Design
The system uses a **shared database, shared schema** multi-tenancy model, ensuring data isolation per company via a `company_id` column and `AsyncLocalStorage` in Express sessions.

### Authentication & Authorization
**Passport.js Local Strategy** handles authentication with bcrypt hashing. It supports dual user systems (Platform and Company users) and implements **Role-Based Access Control (RBAC)** at both route and component levels.

### Database Architecture
**Drizzle ORM** manages PostgreSQL, providing type-safe queries and migrations. Key features include soft deletes, audit fields, composite keys, and denormalization. PostgreSQL was chosen for ACID compliance, geospatial capabilities, and multi-tenancy support.

### Frontend Architecture
Built with **React 18** and TypeScript, using **Wouter** for routing, **TanStack Query** for server state, **React Hook Form + Zod** for validation, and **shadcn/ui + Tailwind CSS** for UI. It adopts a **mobile-first design** with responsive breakpoints and touch optimization.

### Backend Architecture
Features **RESTful API endpoints** with modular routing. Key services include a **Route Optimization Service** (Turf.js for geospatial calculations), a **Recurring Orders Service**, and a **Storage Service** for company-scoped database queries.

### Real-Time Features
**WebSockets** enable real-time driver location tracking and route status updates.

### Geographic Data Management
Utilizes a **hierarchical address system** and **Leaflet Maps Integration** for interactive route planning, visualization, and customer location capture.

### File Upload Handling
Uses **Multer Middleware** for in-memory file uploads (company logos, product images, user avatars) with a 5MB limit.

### PDF Generation & Printing
Employs **HTML-to-Canvas** (html2canvas + jsPDF) for complex layouts like invoices and **Direct jsPDF Generation** for simpler documents.

### Internationalization (i18n)
Uses **react-i18next** for Spanish and English language support, with locale files and session persistence.

## External Dependencies

### Core Infrastructure
-   **PostgreSQL Database**

### Third-Party Services

#### Map & Geolocation
-   **Leaflet.js**: Map rendering.
-   **Turf.js**: Geospatial analysis.
-   **OpenStreetMap tiles**: Map data.

#### Payment Processing
-   **Stripe Integration**: For membership billing.

#### UI Component Libraries
-   **Radix UI**: Accessible component primitives.
-   **Lucide React**: Icon system.
-   **shadcn/ui**: Pre-composed component patterns.

## Recent Changes

### October 10, 2025 - Payment System Improvements

#### Delivery Processing Fix (Critical Bug Fix)
- **Fixed orders staying in "pending" status** when marked as delivered by drivers
  - **Root cause**: Frontend called non-existent endpoint instead of invoice-creating endpoint
  - **Solution**: Changed to use `/api/mobile/orders/:id/deliver-and-invoice` which:
    - Updates order status to "delivered"
    - Sets `actualDeliveryTime` timestamp
    - Creates invoice and payment records automatically
    - Tracks which user delivered the order (new `deliveredBy` field)
  - **Database change**: Added `delivered_by` column to `orders` table

#### Credit Payment Visibility Fix (Bug Fix)
- **Fixed missing evidence of credit payments** in payments page
  - **Root cause**: System only created payment records for cash, skipping credit transactions
  - **Solution**: Modified delivery endpoint to create payment records for ALL payment methods:
    - Cash/Card/Transfer: payment amount = actual amount received
    - Credit: payment amount = full invoice total (enables accounts receivable tracking)
    - Credit notes: "Crédito pendiente de pago - Entrega en ruta [X] - Total adeudado: [amount]"
  - **Benefits**:
    - Credit transactions now visible in payments list
    - Financial reporting includes credit sales
    - Can filter payments by "credit" method
  - **Verified**: E2E test confirmed credit payments appear with correct amount and can be filtered

### October 11, 2025 - Bottle Returns in Mobile App

#### Mobile API Product Properties Fix (Critical Bug Fix)
- **Fixed missing `isReturnable` property** in mobile orders endpoint
  - **Root cause**: `/api/mobile/orders` endpoint was not returning `isReturnable` and `bottleDeposit` properties for products
  - **Impact**: Mobile app couldn't detect returnable products, hiding the "Retornar Envases" button
  - **Solution**: Updated mobile API to include product properties in response:
    ```sql
    SELECT name, is_returnable, deposit_amount FROM products
    ```
  - **Changes made** in `server/routes/mobile-api.ts`:
    - Added `isReturnable` property to product objects (boolean)
    - Added `bottleDeposit` property to product objects (string)
    - Applied to both successful and error cases
  - **Frontend integration**: Mobile app now correctly detects returnable products and displays return dialog

#### BottleReturnDialog Component Enhancement
- **Completely rewrote component** to handle multiple returnable products with proper validation
  - **Location**: `client/src/components/bottleReturns/BottleReturnDialog.tsx`
  - **Key features**:
    - Product selector dropdown for multiple returnable items
    - Cumulative validation: prevents returning more bottles than ordered minus previously returned
    - Real-time calculation of available quantity
    - Display of existing returns below the form
    - Fixed apiRequest signature to use object parameter: `{ url, method, data }`
  - **Validation logic**: `maxReturnQuantity = orderQuantity - sum(existingReturns)`
  
#### Mobile Delivery Details Integration
- **Integrated BottleReturnDialog** into mobile delivery details page
  - **Location**: `client/src/pages/mobile-app/entregas/[id].tsx`
  - **Conditional rendering**: "Retornar Envases" button only appears when:
    - Order has products with `isReturnable: true`
    - Order status is not "delivered"
  - **Data flow**:
    - `getReturnableProducts()`: Filters products by `isReturnable` property
    - `getExistingReturns()`: Maps bottle returns for validation
    - `loadDeliveryDetails()`: Refreshes data after successful return registration

#### Technical Notes
- **Backend endpoints remain unchanged**: All bottle return logic already existed
- **The fix was purely about data visibility**: Ensuring mobile API returns the necessary product properties
- **Type safety**: Dialog properly handles missing/undefined properties with fallback values