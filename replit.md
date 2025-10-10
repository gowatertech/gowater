# GoWater - Water Delivery Management System

## Overview

GoWater is a comprehensive multi-tenant water delivery management system designed to manage the entire lifecycle of water distribution operations. It supports multiple independent companies (tenants) and offers features such as customer management, route optimization, inventory tracking, recurring orders, driver coordination, real-time location tracking, invoicing, and commission calculations. The system aims to streamline water delivery logistics, improve operational efficiency, and provide a robust platform for businesses in the water distribution sector. It is built as a full-stack TypeScript application with a React frontend and an Express backend, utilizing PostgreSQL and Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### October 2025 - Route Optimization & Security Enhancements
- **Mandatory Route Optimization**: Implemented required optimization step in route creation wizard
  - Continue button disabled until route is optimized (enforced via UI state)
  - Visual warning displayed: "⚠️ Debes optimizar la ruta antes de continuar"
  - Backend calculates optimal sequence and distance using Haversine formula
  - Frontend persists optimized distance from backend response to database
  - Double validation prevents bypassing optimization requirement
- **Distance Persistence Fix**: Corrected route creation flow to save optimized totalDistance to database
  - Frontend captures distance from POST /api/routes/optimize response
  - Distance included in create route payload and persisted to routes.total_distance column
  - Verified with e2e tests: distance correctly saved (e.g., 49.70 km for test route)
- **Auto-Copy Customer Coordinates to Orders**: Orders now automatically inherit delivery coordinates from customer records
  - POST /api/orders endpoint queries customer coordinates within transaction before order creation
  - Coordinates persisted to orders.delivery_coordinates field for route optimization
  - Transactional integrity ensures company isolation and data consistency
  - Proper logging and null handling for customers without coordinates
  - Verified with e2e tests: order creation correctly copies coordinates (e.g., order #82)
- **Delivery Sequence Persistence**: Orders now receive delivery_sequence when routes are created
  - POST /api/routes maps deliverySequence array to individual orders during route creation
  - Backend filters warehouse tokens ("company"/"warehouse") before assigning sequences
  - Sequence numbers assigned incrementally only to actual order IDs
  - RouteTimeline fetches orders via GET /api/routes/:id/orders and groups by delivery_sequence
  - Timeline displays delivery counts per stop (e.g., "1 pedido", "2 pedidos") with Package icon
  - Verified with e2e tests: Route #57 correctly persists delivery_sequence 1,2 to orders
- **Enhanced Route Timeline UI** (October 10, 2025):
  - **Web Timeline Improvements**: Enhanced RouteTimeline.tsx to display complete customer information
    - Shows customer name and full address (street + number) for each delivery stop
    - Clickable delivery counter button opens dialog with detailed product information
    - Dialog displays: customer info, order number, total amount, and itemized product list with quantities and prices
    - Removed custom queryFn, now uses standard TanStack Query pattern
  - **Critical Bug Fixes**:
    - **Route Stops Data Corruption Fix**: Corrected StepRouteFormOptimized.tsx to send coordinate strings instead of objects
      - Changed `stops: stops` to `stops: stops.map(stop => stop.coordinates)` (line 971)
      - Prevents "[object Object]" corruption in database (verified: route #59 has valid coordinates vs route #57 with corrupted data)
    - **Timeline Mapping Logic Fix**: Corrected RouteTimeline.tsx delivery sequence mapping
      - route.stops[0] now correctly maps to deliverySequence=1 (not warehouse)
      - Warehouse rendered separately before customer stops
      - Fixed index-to-sequence alignment: stops[index] → deliverySequence = index + 1
  - Mobile timeline component already had complete functionality (no changes needed)
- **Multi-Tenant Security Hardening**: Added companyId filtering to all critical API endpoints (startRoute, vehicleLoading, commissions) to prevent cross-company data leaks
- **Authentication Fix**: Implemented `normalizeLoginFields` middleware to support both username and email login formats, ensuring compatibility between mobile app (sends username) and web app (sends email)
- **Input Validation**: Added NaN checks after parseInt/Number conversions to prevent invalid data processing
- **Sync Service Fix**: Corrected syncInProgress flag reset using finally block to prevent stuck sync state
- **LocalStorage Error Handling**: Added comprehensive error handling with safe helper functions for localStorage operations in mobile app
- **Database Context Fix**: Removed hardcoded companyId from db-connect.js to ensure proper multi-tenant context
- **Test Accounts**: Created test users for e2e testing (alvinleandro for company 1, conductor_test_15 for company 15, aguamoya@gmail.com for company 15)
- **Route Details Fix**: Fixed RouteMap component to properly fetch route orders using correct queryFn endpoint
- **Customer Location Capture System** (October 10, 2025):
  - **Two-Method Location Capture**: Implemented dual approach for capturing customer delivery locations
    - **Admin Map Selection**: LocationCaptureDialog component allows administrators to select customer location directly on interactive map
    - **WhatsApp Self-Service**: Token-based public link generation for customers to share their location via WhatsApp
  - **Security Implementation**:
    - location_capture_tokens table with UUID tokens and 24-hour expiration
    - Public endpoint /api/public/location/:token for unauthenticated location updates
    - Token validation ensures security without exposing customer data
  - **User Experience**:
    - Customer list includes dropdown menu (MoreVertical icon) with actions: "Ver Detalles", "Capturar en Mapa", "Enviar por WhatsApp"
    - WhatsApp link includes customer name and company context
    - Public page (/public/location/:token) provides clean interface for customers
    - Success confirmations and error handling for both flows
  - **Technical Implementation**:
    - POST /api/customers/:id/request-location generates token and WhatsApp URL
    - GET /api/public/location/:token validates token and returns customer info
    - POST /api/public/location/:token updates customer coordinates publicly
    - PATCH /api/customers/:id updates customer including coordinates (auth required)
    - LocationSelector component reused across admin dialog and public page
    - Coordinates stored in "lat,lng" string format in customers table
  - **Critical Bug Fix**: Resolved stale coordinate state in LocationCaptureDialog
    - Added useEffect to reset coordinates when customerId, open, or currentCoordinates change
    - Implemented handleClose function to clear local state
    - Parent component clears locationCaptureCustomer when dialog closes
    - Prevents coordinates from one customer being saved to another customer
- **Location Dialog Cancel Bug Fix** (October 10, 2025):
  - Fixed issue where canceling the map location capture dialog would inhibit/disable other customer menu options
  - Root cause: Early return `if (!open) return null` prevented proper Dialog component cleanup
  - Solution: Removed early return and `modal={false}` prop to allow React proper unmounting
  - Dialog now stays mounted while closed, enabling ShadCN's internal cleanup to run correctly
  - Prevents lingering focus trap that blocked other UI interactions after canceling
  - Default modal behavior restored without affecting save/cancel or reopen functionality

## System Architecture

### Multi-Tenancy Design
The system employs a **shared database, shared schema** multi-tenancy model. Data isolation per company is achieved using a `company_id` column in core tables, managed through Express sessions and `AsyncLocalStorage`. Middleware ensures proper company context and prevents cross-tenant data leakage. It distinguishes between platform-level data (companies, plans) and company-specific operational data.

### Authentication & Authorization
Authentication uses **Passport.js Local Strategy** with bcrypt hashing and PostgreSQL-backed sessions. There are dual user systems: Platform users for system administration and Company users with various operational roles (admin, supervisor, cashier, driver, assistant). **Role-Based Access Control (RBAC)** is enforced at both route and component levels.

### Database Architecture
**Drizzle ORM** provides type-safe database queries and migrations. The schema is centralized in `shared/schema.ts`. Key patterns include soft deletes, `created_at`/`updated_at` audit fields, composite keys, and denormalization for historical data. PostgreSQL was chosen for its ACID compliance, geospatial capabilities, and multi-tenancy support, while Drizzle ORM was selected for its TypeScript inference, lightweight nature, and SQL-like syntax.

### Frontend Architecture
Built with **React 18** and TypeScript, using **Wouter** for routing, **TanStack Query** for server state management and caching, **React Hook Form + Zod** for type-safe form validation, and **shadcn/ui + Tailwind CSS** for UI components and styling. The state management strategy prioritizes TanStack Query for server state and React hooks for local UI state, avoiding global state libraries like Redux/Zustand. It features a **mobile-first design** with responsive breakpoints, mobile-specific routes, and touch optimization.

### Backend Architecture
Features **RESTful API endpoints** organized by resource, with modular routing. It distinguishes between platform and company-specific APIs. Key services include a **Route Optimization Service** (using Turf.js for geospatial calculations and nearest-neighbor algorithm), a **Recurring Orders Service** for automated order generation, and a **Storage Service** abstracting database operations with company-scoped queries.

### Real-Time Features
**WebSockets** are implemented for real-time features like driver location tracking and route status updates, providing better performance and efficiency than polling.

### Geographic Data Management
Utilizes a **hierarchical address system** and **Leaflet Maps Integration** for interactive route planning and visualization, supporting zone-based routing.

### File Upload Handling
Uses **Multer Middleware** for in-memory temporary storage with a 5MB file size limit, supporting company logos, product images, and user avatars.

### PDF Generation & Printing
Employs a dual approach: **HTML-to-Canvas** (html2canvas + jsPDF) for complex layouts like invoices, and **Direct jsPDF Generation** for simpler documents and receipts, addressing mobile browser inconsistencies.

### Internationalization (i18n)
Uses **react-i18next** to support Spanish and English, with translation keys in locale files and language persistence in user sessions.

## External Dependencies

### Core Infrastructure
-   **PostgreSQL Database**: Primary data store (Neon serverless recommended).
-   **Environment Variables**: `DATABASE_URL`, `PLATFORM_DATABASE_URL` (optional), `SESSION_SECRET`.

### Third-Party Services

#### Map & Geolocation
-   **Leaflet.js**: Map rendering.
-   **Turf.js**: Geospatial analysis.
-   **OpenStreetMap tiles**: Used for map data (no external map API dependency).

#### Payment Processing
-   **Stripe Integration**: Partial implementation for membership billing (`@stripe/stripe-js`, `@stripe/react-stripe-js`).

#### UI Component Libraries
-   **Radix UI**: Accessible component primitives.
-   **Lucide React**: Icon system.
-   **shadcn/ui**: Pre-composed component patterns.

#### Development & Build Tools
-   **Vite**: Frontend build tool and dev server.
-   **esbuild**: Backend bundling.
-   **Drizzle Kit**: Database schema management.
-   **tsx**: TypeScript execution for scripts.