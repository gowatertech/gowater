# GoWater - Water Delivery Management System

## Overview

GoWater is a comprehensive multi-tenant water delivery management system designed to streamline water distribution operations. It supports multiple independent companies, offering features such as customer management, route optimization, inventory tracking, recurring orders, driver coordination, real-time location tracking, invoicing, and commission calculations. The system aims to enhance operational efficiency for businesses in the water distribution sector, built as a full-stack TypeScript application with a React frontend, Express backend, PostgreSQL, and Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### October 10, 2025 - Mobile App Bug Fixes and Enhancements

#### Route Start Endpoint Fix (Critical Bug Fix)
- **Fixed route start functionality** returning HTML instead of JSON
  - **Root cause**: Double `/api` prefix - endpoint registered as `/api/routes/:id/start` inside router already mounted at `/api`
  - **Result**: Effective path was `/api/api/routes/:id/start`, causing requests to `/api/routes/:id/start` to fall through to Vite middleware
  - **Solution**: Removed `/api` prefix from endpoint registration in `server/routes/api/startRoute.ts` (changed to `/routes/:id/start`)
  - **Verification**: Endpoint now correctly returns JSON with `Content-Type: application/json` and proper response structure: `{"success":true,"route":{...}}`
  - Active route validation working correctly - prevents drivers from starting multiple routes simultaneously

#### Route List/Map Two-View System
- **Implemented dual-view navigation** for mobile map interface
  - **List View** (default): Shows all active routes with comprehensive information cards
  - **Map View**: Displays detailed interactive map for selected route only
  - Route cards display: name, driver, stop count, status badge (color-coded), distance, and date
  - Status badges use consistent green color for pending status to maintain visual homogeneity
  - Status colors: green (pending/completed), blue (in progress), orange (paused)
  - Selecting a route transitions smoothly to focused map view
  - Back button returns to list view and clears selection
  - Header title dynamically updates to show route name when viewing specific route
  
- **Driver-specific route filtering**
  - Implemented role-based route filtering using `driverRoutes` memoized filter
  - Drivers only see routes assigned to them (filtered by `route.driverId === user.id`)
  - Admin users see all routes
  - Empty state message updated to "No tienes rutas asignadas" for better UX
  
- **Route filtering on map view**
  - Map now displays only the selected route's stops and polyline
  - Uses `displayedRoutes` memoized filter to optimize rendering
  - Auto-zoom focuses on selected route's geographic bounds
  - Eliminates visual clutter from showing all routes simultaneously

#### Mobile Map Coordinate Alignment Fix
- **Fixed customer location markers on mobile map**
  - **Root cause**: Mobile map used `route.stops` (stored route coordinates) which could be outdated or corrupted
  - **Solution**: Changed to use `order.coordinates` (actual customer location) directly from orders, matching web map behavior
  - Mobile map now shows correct customer locations instead of stale route stop coordinates
  - Updated both marker rendering and zoom calculation to use order coordinates
  - Eliminated discrepancy between marker positions and popup information
  
- **Fixed warehouse marker inconsistency** between web and mobile maps
  - **Root cause**: Mobile map used `useState` with initial value that locked coordinates before `settings` data loaded from API
  - **Solution**: Changed to reactive calculation like web map: `warehousePosition = settings?.latitude && settings?.longitude ? [lat, lng] : null`
  - Warehouse marker now displays at correct company settings coordinates (e.g., latitude: 19.075380, longitude: -70.128822 for AGUA HARRIS)
  - Improved warehouse marker design: Changed from purple circle with "0" to green circle with 🏢 emoji to match web map aesthetic
  - Added informative Popup to warehouse marker displaying:
    - Title: "Almacén"
    - Company name from settings
    - Exact GPS coordinates with 6 decimal precision
    
- **Customer Information Popups on Mobile Map**
  - Added interactive Popups to delivery stop markers
  - Each popup displays: route name, stop number, customer name, full address, and order total
  - Shows count of additional orders when multiple deliveries exist at same stop
  - Mobile map now has information parity with web timeline view

#### Mobile Route Edit and Details Navigation
- **Fixed edit and details buttons** in mobile route view (`/mobile-app/ruta`)
  - **Root cause**: Dynamic route `/mobile-app/entregas/:id` was not registered in `App.tsx`
  - **Problem 1**: Edit button tried to open a non-existent dialog (`showEditOrderDialog`)
  - **Problem 2**: When navigation was implemented, page stayed blank because route wasn't registered
  - **Solution**: 
    - Changed both buttons to navigate to delivery details page (`/mobile-app/entregas/[id]`)
    - Registered dynamic route in `App.tsx` with proper import and route configuration
    - Ensured dynamic route appears before generic route for correct Wouter matching
  
- **Implemented auto-edit mode** for seamless editing experience
  - Edit button navigates with `?edit=true` parameter
  - Details button navigates without edit parameter (read-only mode)
  - Auto-edit mode uses deferred initialization pattern:
    1. URL parameter `edit=true` sets `autoEnterEditMode` flag
    2. After delivery data loads, initializes `editedProducts` with delivery products
    3. Then activates edit mode (`isEditing = true`)
  - Ensures edit form loads with correct product data, matching manual edit flow
  
- **Navigation patterns**:
  - Edit: `/mobile-app/entregas/{orderId}?routeId={routeId}&edit=true` → Opens in edit mode with products loaded
  - Details: `/mobile-app/entregas/{orderId}?routeId={routeId}` → Opens in read-only mode
  
- **Technical implementation**:
  - Added import: `import MobileDeliveryDetails from "@/pages/mobile-app/entregas/[id]"`
  - Registered route: `<Route path="/mobile-app/entregas/:id" component={MobileDeliveryDetails} />`
  - Route order matters: Dynamic route must come before generic `/mobile-app/entregas` route

#### Mobile Delivery Details Authentication Fix (Critical Bug Fix)
- **Fixed authentication errors** in mobile delivery details page
  - **Root cause**: All API calls used direct `fetch()` without `credentials: 'include'`, causing session cookies not to be sent
  - **Impact**: Backend middleware rejected requests with "Unauthorized" errors, preventing data loading
  - **Solution**: Replaced all 8 `fetch()` calls with `apiRequest()` helper that automatically includes credentials
  - **Affected functions**:
    1. `loadDeliveryDetails()` - Loading delivery data
    2. `loadCompanySettings()` - Loading company settings for invoices
    3. `loadBottleReturns()` - Loading bottle return history
    4. `registerBottleReturn()` - Registering new bottle returns
    5. `saveProductChanges()` - Updating order products (PATCH)
    6. `processDelivery()` - Processing delivery and payment (POST)
    7. `handlePrint()` - Loading order data for printing
    8. `handleDownload()` - Loading order data for PDF generation
  - **Technical details**:
    - `apiRequest()` helper located in `client/src/lib/queryClient.ts`
    - Automatically includes `credentials: 'include'` option
    - Works with session-based authentication via `express-session`
    - Backend uses `consolidatedCompanyMiddleware` that validates session and extracts `companyId`
  - **Result**: All network calls now properly send session cookies, enabling authenticated access to API endpoints

#### Order Products Update Endpoint Implementation
- **Created missing PATCH endpoint** `/api/orders/:orderId/products` for updating order items
  - **Root cause**: Frontend attempted to save product changes but backend endpoint didn't exist
  - **Implementation details**:
    - Uses SQL transactions to ensure data consistency
    - Deletes existing `order_items` for the order
    - Inserts new `order_items` with updated quantities
    - Recalculates and updates order total
    - Automatic rollback on errors
  - **Column naming fix**: Changed `unit_price` to `price` to match database schema
  - **Location**: `server/routes/orders.ts` (lines 551-668)
  - **Result**: Drivers can now successfully update product quantities from mobile delivery details

#### Delivery Sequence Order Fix
- **Fixed delivery order inconsistency** after product updates
  - **Root cause**: Mobile route view ordered deliveries by array index instead of `deliverySequence` field
  - **Problem**: Backend could return orders in different order after updates, causing visual position changes
  - **Solution**: Added sorting by `deliverySequence` before mapping orders to route stops
  - **Implementation**: `const sortedOrders = [...response].sort((a, b) => (a.deliverySequence || 999) - (b.deliverySequence || 999))`
  - **Location**: `client/src/pages/mobile-app/ruta/index.tsx` (lines 264-269)
  - **Result**: Deliveries now maintain correct order regardless of backend response order

#### Mobile Order Creation Flow (3-Step Wizard)
- **Implemented step-by-step order creation** from mobile app for drivers
  - **Dashboard change**: Replaced "Rutas Pendientes" button (white/outline) with "Crear Pedido" button with cart icon 🛒
  - **Paso 1 - Seleccionar Cliente**: 
    - Search box filters customers by name, phone, address (all fields)
    - Touch-optimized cards display business name, manager, address, phone
    - Customer stored in sessionStorage for next step
  - **Paso 2 - Agregar Productos**:
    - Large tactile +/- buttons (h-12 w-12) for quantity adjustment
    - Real-time total calculation
    - Subtotals displayed per product
    - State persists when navigating back from Paso 3
    - Footer shows order total and "Revisar Pedido" button
  - **Paso 3 - Confirmar Pedido**:
    - Shows customer info, product list, subtotal, ITBIS (18%), total
    - Creates order via POST /api/orders
    - Clears sessionStorage after successful creation
    - Invalidates relevant queries and redirects to dashboard
  - **Routes registered**: 
    - `/mobile-app/nuevo-pedido/paso1` → Customer selection
    - `/mobile-app/nuevo-pedido/paso2` → Add products
    - `/mobile-app/nuevo-pedido/paso3` → Confirm order
  - **Technical implementation**:
    - Session persistence between steps using sessionStorage
    - Hydration logic restores quantities when returning to Paso 2
    - Comprehensive data-testid attributes for E2E testing
    - Default values: payment method "cash", today's date

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
Utilizes a **hierarchical address system** and **Leaflet Maps Integration** for interactive route planning, visualization, and customer location capture (admin map selection and WhatsApp self-service).

### File Upload Handling
Uses **Multer Middleware** for in-memory file uploads (company logos, product images, user avatars) with a 5MB limit.

### PDF Generation & Printing
Employs **HTML-to-Canvas** (html2canvas + jsPDF) for complex layouts like invoices and **Direct jsPDF Generation** for simpler documents.

### Internationalization (i18n)
Uses **react-i18next** for Spanish and English language support, with locale files and session persistence.

## External Dependencies

### Core Infrastructure
-   **PostgreSQL Database**
-   **Environment Variables**: `DATABASE_URL`, `PLATFORM_DATABASE_URL`, `SESSION_SECRET`

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

#### Development & Build Tools
-   **Vite**: Frontend build tool.
-   **esbuild**: Backend bundling.
-   **Drizzle Kit**: Database schema management.
-   **tsx**: TypeScript execution.