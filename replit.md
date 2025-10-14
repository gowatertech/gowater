# GoWater - Water Delivery Management System

## Overview
GoWater is a multi-tenant water delivery management system designed to optimize water distribution operations for various companies. It provides features for customer management, route optimization, inventory tracking, recurring orders, driver coordination, real-time tracking, invoicing, and commission calculations. The system aims to significantly enhance operational efficiency in the water distribution sector. It is built as a full-stack TypeScript application utilizing a React frontend, Express backend, PostgreSQL database, and Drizzle ORM.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Multi-Tenancy Design
The system employs a **shared database, shared schema** multi-tenancy model, ensuring data isolation for each company through a `company_id` column and `AsyncLocalStorage` in Express sessions.

### Authentication & Authorization
**Passport.js Local Strategy** handles authentication with bcrypt hashing. It supports distinct user types (Platform and Company users) and implements **Role-Based Access Control (RBAC)** at both route and component levels.

### Database Architecture
**Drizzle ORM** is used with PostgreSQL for type-safe queries and migrations. The architecture incorporates soft deletes, audit fields, composite keys, and denormalization. PostgreSQL was selected for its ACID compliance, geospatial capabilities, and native multi-tenancy support.

### Frontend Architecture
Developed with **React 18** and TypeScript, the frontend uses **Wouter** for routing, **TanStack Query** for server state management, and **React Hook Form + Zod** for form validation. The UI is built with **shadcn/ui + Tailwind CSS**, following a **mobile-first design** philosophy with responsive breakpoints.

### Backend Architecture
The backend provides **RESTful API endpoints** with a modular routing system. Key services include a **Route Optimization Service** (utilizing Turf.js for geospatial calculations), a **Recurring Orders Service**, and a **Storage Service** for company-scoped database operations.

### Real-Time Features
**WebSockets** facilitate real-time driver location tracking and instantaneous route status updates.

### Geographic Data Management
A **hierarchical address system** is integrated with **Leaflet Maps** for interactive route planning, visualization, and precise customer location capture.

### File Upload Handling
**Multer Middleware** manages in-memory file uploads (e.g., company logos, product images) with a 5MB limit.

### PDF Generation & Printing
The system uses **HTML-to-Canvas** (html2canvas + jsPDF) for generating complex PDF layouts like invoices and **Direct jsPDF Generation** for simpler documents.

### Internationalization (i18n)
**react-i18next** is implemented for multilingual support, specifically English and Spanish, with locale file management and session persistence for language preferences.

### Progressive Web App (PWA)
The application is fully configured as a **Progressive Web App** for mobile installation:
- **Manifest.json**: Complete PWA manifest with app metadata, theme colors, and display configuration
- **PNG Icons**: Nine icon sizes (72x72, 96x96, 128x128, 144x144, 152x152, 180x180, 192x192, 384x384, 512x512) for comprehensive device support
- **iOS Support**: Apple touch icon (180x180) and mobile web app meta tags for iOS devices
- **Installable**: Users can install the app on Android and iOS home screens with proper app icon display
- **Standalone Mode**: App runs in standalone mode without browser UI when installed

### Accessibility & Testing Standards
The application follows **WCAG 2.1** accessibility guidelines with comprehensive testing coverage:
- **Icon-only buttons**: All require explicit `aria-label` attributes for screen reader accessibility
- **Interactive elements**: All have unique `data-testid` attributes for automated testing
- **Mobile-first design**: Responsive layouts optimized for touch devices (mobile cards, desktop tables)
- **Testing infrastructure**: E2E tests via Playwright, test session endpoint (`/api/test-session/login`) for development

### Recent Improvements
#### Users Page - Mobile-First Redesign (October 2025)
- **Modern StatCards**: Four statistics cards with colored icon backgrounds (Total Usuarios, Administradores, Conductores, Asistentes)
- **Responsive Layout**: Card-based view for mobile (<768px), table view for desktop (≥768px)
- **Enhanced Search**: Real-time search across name, username, email, phone, and role
- **Mobile Cards**: Rich user cards with role icons, contact information, and action dropdowns
- **Desktop Table**: Clean table with user data, role badges, and contact information
- **Accessibility Compliance**:
  - All icon-only buttons have aria-labels ("Limpiar búsqueda", "Más acciones")
  - Data-testid attributes on all interactive elements
  - Role-specific icons for visual identification (Shield for admin, Truck for driver, HeartPulse for assistant)
- **Route**: `/users`

#### Customers Page - Mobile-First Redesign (October 2025)
- **Modern StatCards**: Four statistics cards with colored icon backgrounds (Total Clientes, Crédito Total, Crédito Promedio, Provincias)
- **Responsive Layout**: Card-based view for mobile (<768px), table view for desktop (≥768px)
- **Enhanced Search**: Real-time search across business name, manager, RNC, and phone number
- **Mobile Cards**: Rich customer cards displaying logo, zone badge, contact info, address, credit, and location status
- **Desktop Table**: Clean table with customer data, zone badges, and action dropdowns
- **Accessibility Compliance**:
  - All icon-only buttons have aria-labels ("Limpiar búsqueda", "Más acciones")
  - Data-testid attributes on all interactive elements
  - Screen reader friendly with proper semantic markup
- **Route**: `/customers`

#### Balance de Envases (Bottle Returns) - Mobile-First Redesign (October 2025)
- **Responsive Layout**: Card-based view for mobile (<768px), table view for desktop (≥768px)
- **Search & Filter**: Real-time search by customer name, filter by status (All/Pending)
- **Accessibility Compliance**:
  - All icon-only buttons use shadcn Button component with aria-labels
  - Clear search button resets both search query and filter state
  - Data-testid attributes on all interactive elements
- **Route**: `/bottles/balance` (consolidated from previous `/envases/balance`)

#### Manual de Usuario - Comprehensive User Guide (October 2025)
- **Complete Documentation**: Comprehensive manual covering all system functionalities organized into 12 major sections
- **Intelligent Search**: Real-time search filtering across feature titles, descriptions, and sub-features with "no results" handling
- **Responsive Design**: Desktop sidebar navigation with mobile tab selector for seamless cross-device experience
- **Interactive Features**: Expandable feature cards showing detailed sub-functionalities and use cases
- **Modern UI**: Gradient backgrounds, color-coded sections, and intuitive icons for visual clarity
- **Accessibility**:
  - Full data-testid coverage on all interactive elements
  - Screen reader friendly with proper semantic markup
  - Keyboard navigation support
- **Sections Covered**:
  - Panel Principal (Dashboard)
  - Clientes (Customers)
  - Pedidos (Orders & Recurring Orders)
  - Rutas y Entregas (Routes & Deliveries)
  - Inventario (Inventory, Warehouses, Production)
  - Envases (Bottle Management)
  - Finanzas (Billing & Commissions)
  - Reportes (Reports & Analytics)
  - Flota (Fleet & Drivers)
  - App Móvil (Mobile PWA for Drivers)
  - Usuarios y Configuración (Users & Settings)
  - Administración de Plataforma (Multi-tenant Management)
- **Route**: `/manual`
- **Menu Location**: Accessible from main sidebar navigation menu

## External Dependencies

### Core Infrastructure
-   **PostgreSQL Database**

### Third-Party Services

#### Map & Geolocation
-   **Leaflet.js**: For interactive map rendering.
-   **Turf.js**: For advanced geospatial analysis.
-   **OpenStreetMap tiles**: Provides underlying map data.

#### Payment Processing
-   **Stripe Integration**: Used for managing membership billing.

#### UI Component Libraries
-   **Radix UI**: Provides accessible and unstyled component primitives.
-   **Lucide React**: Offers a comprehensive icon system.
-   **shadcn/ui**: Supplies pre-composed and customizable UI components.