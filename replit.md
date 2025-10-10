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