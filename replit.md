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