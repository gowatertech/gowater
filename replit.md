# GoWater - Water Delivery Management System

## Overview

GoWater is a comprehensive multi-tenant water delivery management system that handles the complete lifecycle of water distribution operations. The system supports multiple companies (tenants) operating independently, with features including customer management, route optimization, inventory tracking, recurring orders, driver coordination, real-time location tracking, invoicing, and commission calculations.

The application is built as a full-stack TypeScript solution with a React frontend and Express backend, using PostgreSQL as the primary database with Drizzle ORM for type-safe database operations.

## Recent Changes

### User Creation Form CompanyID Fix (October 2025)
**Issue**: User creation form failed to submit because `currentUser` was not loading, preventing dynamic `companyId` injection into the form.

**Root Cause**: 
- `useCurrentUser` hook attempted to fetch from non-existent `/api/me` endpoint (returned 401/403)
- Hook's `useEffect` had dependency issues causing it not to execute properly
- Form validation failed because `companyId` was missing (required field)

**Solution**:
1. **Fixed useCurrentUser Hook** (`client/src/hooks/use-current-user.ts`):
   - Changed endpoint from `/api/me` to `/api/authtest` (existing endpoint that returns user data)
   - Fixed `useEffect` to run once on mount with empty dependency array
   - Simplified user extraction: `const user = result.user || result.sessionUser`

2. **Form CompanyID Injection** (already working correctly):
   - Default values: `companyId: currentUser?.companyId || 0`
   - UseEffect updates form when user loads: `form.setValue('companyId', currentUser.companyId)`
   - **100% dynamic** - no hardcoded values, pulls from logged-in user's session

**Files Modified**:
- `client/src/hooks/use-current-user.ts` - Fixed endpoint and useEffect execution
- `client/src/pages/users/index.tsx` - CompanyId injection logic (previously added)

**Testing**: End-to-end test confirmed user creation works with dynamic `companyId=15` from logged-in user `aguamoya@gmail.com`.

### User Creation Email Validation Fix (October 2025)
**Issue**: User creation form silently failed when email field was left empty due to Zod validation rejecting empty strings with `.email().optional()`.

**Solution**: 
- Updated `insertUserSchema` email field to use `z.union([z.string().email(), z.literal("")]).optional()` which properly validates:
  - Empty strings (`""`) ✓
  - Valid email addresses ✓
  - Rejects invalid formats ✗
- Frontend converts empty email strings to `undefined` before API submission for proper handling
- Removed all sensitive console logging that exposed user credentials (security vulnerability)

**Files Modified**:
- `shared/schema.ts` - Email validation schema update
- `client/src/pages/users/index.tsx` - Email normalization and security cleanup

**Testing**: Verified user creation with empty email (user ID 16 in database confirms functionality).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Multi-Tenancy Design

The system implements a **shared database, shared schema** multi-tenancy pattern:

- **Company Isolation**: All core tables include a `company_id` column for data segregation
- **Session-Based Context**: Company context is established through Express sessions and maintained using AsyncLocalStorage
- **Middleware Chain**: Multiple middleware layers (`tenantMiddleware`, `companyDbMiddleware`, `consolidatedCompanyMiddleware`) ensure proper company isolation
- **Platform vs Company Data**: Separate logical domains for platform-level data (companies, plans, memberships) and company-specific operational data

**Design Rationale**: This approach balances operational simplicity (single database) with data isolation requirements, though it requires careful middleware management to prevent cross-tenant data leakage.

### Authentication & Authorization

- **Passport.js Local Strategy**: Username/password authentication with bcrypt hashing
- **Session Management**: PostgreSQL-backed sessions using `connect-pg-simple`
- **Dual User Systems**: 
  - Platform users for system administration
  - Company users for operational roles (admin, supervisor, cashier, driver, assistant)
- **Role-Based Access Control**: Enforced at both route and component levels

**Trade-off**: The dual user system adds complexity but enables both SaaS platform management and per-company user hierarchies.

### Database Architecture

#### ORM & Migrations
- **Drizzle ORM**: Type-safe database queries with schema-first design
- **Migration Strategy**: Drizzle Kit for generating migrations, custom scripts for applying them
- **Schema Location**: Centralized in `shared/schema.ts` for type sharing between frontend and backend

#### Key Schema Patterns
- **Soft Deletes**: Users marked as inactive rather than deleted
- **Audit Fields**: `created_at`, `updated_at` timestamps on most entities
- **Composite Keys**: Route-order relationships, invoice-payment linkages
- **Denormalization**: Customer address data duplicated in orders for historical accuracy

### Frontend Architecture

#### Technology Stack
- **React 18** with TypeScript
- **React Router (Wouter)**: Lightweight routing
- **TanStack Query (React Query)**: Server state management, caching, optimistic updates
- **React Hook Form + Zod**: Form validation with type-safe schemas
- **shadcn/ui + Tailwind CSS**: Component library and styling

#### State Management Strategy
- **Server State**: TanStack Query for all API data
- **Local State**: React hooks for UI-specific state
- **No Global State Library**: Avoided Redux/Zustand complexity by leveraging React Query's caching

**Rationale**: React Query eliminates most needs for global state management while providing superior developer experience for async operations.

#### Mobile-First Design
- **Responsive Breakpoints**: Custom Tailwind configuration with xs-2xl breakpoints
- **Mobile-Specific Routes**: Dedicated `/mobile-app/*` routes for driver interfaces
- **Touch Optimization**: Larger touch targets, simplified navigation for field operations

### Backend Architecture

#### API Design
- **RESTful Endpoints**: Organized by resource (`/api/customers`, `/api/orders`, etc.)
- **Modular Routing**: Separate route files in `server/routes/` directory
- **Platform vs Company APIs**: Distinct routing trees for platform management vs operational endpoints

#### Key Services

**Route Optimization Service** (`services/routeOptimizer.ts`)
- Uses Turf.js for geospatial calculations
- Implements nearest-neighbor algorithm for stop sequencing
- Considers zone boundaries and delivery windows

**Recurring Orders Service** (`recurring-orders.ts`)
- Automated order generation based on frequency patterns (daily, weekly, monthly)
- Tracks last and next generation dates
- Handles partial fulfillment scenarios

**Storage Service** (`storage.ts`)
- Abstraction layer over database operations
- Company-scoped queries enforced at this level
- Centralized business logic for CRUD operations

### Real-Time Features

#### WebSocket Implementation
- **Driver Location Tracking**: Real-time GPS updates from mobile devices
- **Route Status Updates**: Live delivery progress notifications
- **Connection Management**: Automatic reconnection with exponential backoff

**Design Decision**: WebSocket chosen over polling for better mobile battery performance and reduced server load.

### Geographic Data Management

- **Hierarchical Address System**: Province → Municipality → Sector → Street
- **Leaflet Maps Integration**: Interactive route planning and visualization
- **Zone-Based Routing**: Geographic zones for driver assignment and route optimization

### File Upload Handling

- **Multer Middleware**: In-memory storage for temporary processing
- **File Size Limits**: 5MB maximum to balance quality and performance
- **Supported Use Cases**: Company logos, product images, user avatars

### PDF Generation & Printing

Two approaches implemented:

1. **HTML-to-Canvas Method**: Used for complex layouts (invoices)
   - Libraries: html2canvas + jsPDF
   - Better fidelity for styled components
   
2. **Direct jsPDF Generation**: Used for receipts and simple documents
   - Faster performance
   - Better cross-device compatibility

**Challenge**: Mobile browser inconsistencies required dual implementation strategy.

## External Dependencies

### Core Infrastructure
- **PostgreSQL Database**: Primary data store (Neon serverless recommended)
- **Environment Variables Required**:
  - `DATABASE_URL`: Main operational database connection
  - `PLATFORM_DATABASE_URL`: Optional separate platform database
  - `SESSION_SECRET`: Express session encryption key

### Third-Party Services

#### Map & Geolocation
- **Leaflet.js**: Map rendering and interaction
- **Turf.js**: Geospatial analysis and route calculations
- No external map API dependencies (uses OpenStreetMap tiles)

#### Payment Processing
- **Stripe Integration**: Partial implementation for membership billing
- Libraries: `@stripe/stripe-js`, `@stripe/react-stripe-js`
- Status: Framework present, not fully activated

#### UI Component Libraries
- **Radix UI**: Accessible component primitives (dialogs, dropdowns, etc.)
- **Lucide React**: Icon system
- **shadcn/ui**: Pre-composed component patterns

#### Development & Build Tools
- **Vite**: Frontend build tool and dev server
- **esbuild**: Backend bundling for production
- **Drizzle Kit**: Database schema management
- **tsx**: TypeScript execution for scripts

### Notable Architectural Decisions

#### Why PostgreSQL Over Other Databases
- Robust ACID compliance for financial data (invoices, payments)
- Excellent geospatial support (future enhancement path)
- Strong multi-tenancy patterns with row-level security options

#### Why Drizzle ORM Over Prisma/TypeORM
- Better TypeScript inference
- Lighter weight with less runtime overhead
- SQL-like query syntax familiar to developers

#### Why TanStack Query Over Traditional State Management
- Built-in caching reduces API calls
- Optimistic updates improve perceived performance
- Automatic background refetching keeps data fresh
- Eliminates boilerplate for loading/error states

#### Internationalization (i18n)
- **react-i18next**: Supports Spanish and English
- Translation keys stored in frontend locale files
- Language persistence in user session