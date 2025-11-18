import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Package } from "lucide-react";

export default function DocumentationPage() {
  
  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getArchitectureContent = () => {
    return `
================================================================================
TECHROUTE MANAGER - FIELD SERVICE MANAGEMENT APPLICATION
ARCHITECTURAL DESIGN DOCUMENT
================================================================================

Document Version: 1.0
Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
Project Type: Field Service Management for Appliance Repair

================================================================================
TABLE OF CONTENTS
================================================================================

1. EXECUTIVE SUMMARY
2. SUGGESTED APPLICATION NAMES
3. SYSTEM ARCHITECTURE
4. TECHNOLOGY STACK
5. MODULE BREAKDOWN
6. USER ROLES & PERMISSIONS
7. KEY FEATURES OVERVIEW

================================================================================
1. EXECUTIVE SUMMARY
================================================================================

TechRoute Manager is a comprehensive field service management application 
designed specifically for appliance repair companies. The system optimizes 
technician routes, manages service appointments, tracks parts inventory, and 
streamlines the entire repair workflow from initial diagnosis to completion.

PRIMARY OBJECTIVES:
- Optimize daily technician routes for maximum efficiency
- Manage service appointments and customer information
- Track parts and equipment data (brand, model, serial numbers)
- Calculate technician earnings based on vehicle usage and job completion
- Provide supervisor oversight and reassignment capabilities
- Maintain knowledge base for troubleshooting and best practices

TARGET USERS:
- Field Technicians (Mobile access for route and job management)
- Supervisors (Dashboard for oversight and reassignment)
- Administrators (System configuration and reporting)

================================================================================
2. SUGGESTED APPLICATION NAMES
================================================================================

PRIMARY RECOMMENDATION: TechRoute Manager
- Professional and enterprise-grade
- Clearly communicates the dual focus: technicians and route optimization
- Memorable and easy to spell
- Domain likely available: techroute-manager.com

ALTERNATIVE OPTIONS:

1. FixRoute Pro
   - Emphasizes repair (fix) and routing
   - "Pro" adds professional credibility
   - Domain: fixroutepro.com

2. ServiceMap Pro
   - Focus on service mapping and navigation
   - Clean, modern name
   - Domain: servicemappro.com

3. FieldService Navigator
   - Descriptive of the field service industry
   - Navigator implies guidance and optimization
   - Domain: fieldservice-navigator.com

4. AppliFix Manager
   - Specific to appliance repair industry
   - Combines "appliance" + "fix"
   - Domain: applifix-manager.com

5. RouteRepair Pro
   - Direct combination of routing and repair
   - Simple and memorable
   - Domain: routerepairpro.com

RECOMMENDATION RATIONALE:
TechRoute Manager is recommended because it:
- Appeals to both technical staff and management
- Is not limited to appliances (allows for business expansion)
- Sounds professional for B2B sales
- Has good SEO potential for "tech route" and "route manager" searches

================================================================================
3. SYSTEM ARCHITECTURE
================================================================================

ARCHITECTURE PATTERN: Client-Server with RESTful API

COMPONENTS:
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  - React SPA (Single Page Application)                         │
│  - Mobile-responsive design for technician field access        │
│  - Desktop dashboard for supervisors and admin                 │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTP/REST API
┌─────────────────────────────────────────────────────────────────┐
│                        SERVER LAYER                             │
│  - Express.js REST API                                         │
│  - Business logic and route optimization algorithms            │
│  - PDF parsing and data extraction                             │
│  - Geocoding service integration                               │
│  - File upload processing (photos, PDFs)                       │
└─────────────────────────────────────────────────────────────────┘
                              ↕ SQL
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                               │
│  - PostgreSQL relational database                              │
│  - Structured data for customers, jobs, routes, parts          │
│  - Transaction support for data integrity                      │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
│  - Google Maps API (Geocoding & Directions)                    │
│  - File Storage (photos and documents)                         │
└─────────────────────────────────────────────────────────────────┘

DATA FLOW:
1. Supervisor uploads PDF route sheet
2. System parses PDF and extracts job data
3. Addresses are geocoded to coordinates
4. Route optimization algorithm calculates optimal sequence
5. Technician views optimized route on mobile device
6. Technician updates job status and captures photos
7. Supervisor monitors progress and reassigns as needed
8. System calculates weekly earnings based on completed jobs

SCALABILITY CONSIDERATIONS:
- Stateless API design for horizontal scaling
- Database connection pooling
- Caching for frequently accessed data (customer info, product catalog)
- Asynchronous processing for PDF parsing and geocoding
- CDN for static assets and uploaded photos

SECURITY:
- Role-based access control (RBAC)
- JWT authentication for API requests
- HTTPS encryption for all communications
- Secure storage of customer PII and payment information
- Input validation and sanitization
- SQL injection prevention via parameterized queries

================================================================================
4. TECHNOLOGY STACK
================================================================================

FRONTEND:
- Framework: React 18+ with TypeScript
- Routing: Wouter (lightweight React router)
- State Management: TanStack Query (React Query) for server state
- Forms: React Hook Form + Zod validation
- UI Components: shadcn/ui (Radix UI + Tailwind CSS)
- Styling: Tailwind CSS
- Maps: React-Leaflet with OpenStreetMap tiles
- Internationalization: react-i18next (English default, Spanish option)
- Icons: Lucide React
- Date Handling: date-fns

BACKEND:
- Runtime: Node.js
- Framework: Express.js
- Language: TypeScript
- ORM: Drizzle ORM
- Authentication: Passport.js
- Password Hashing: bcrypt
- File Uploads: Multer
- Image Processing: Sharp
- Session Management: express-session

DATABASE:
- RDBMS: PostgreSQL (Neon for serverless deployment)
- Schema Management: Drizzle Kit for migrations

EXTERNAL APIS:
- Google Maps Geocoding API (address to coordinates)
- Google Maps Directions API (route optimization)
- Alternative: Mapbox or OpenRouteService

PDF PROCESSING:
- pdf-parse or similar library for text extraction
- Regular expressions for data extraction

DEVELOPMENT TOOLS:
- Build Tool: Vite
- Package Manager: npm
- Version Control: Git
- Code Quality: ESLint + Prettier

DEPLOYMENT:
- Platform: Replit, Vercel, or similar
- Database: Neon PostgreSQL
- File Storage: Cloud storage (S3-compatible)

================================================================================
5. MODULE BREAKDOWN
================================================================================

MODULE 1: AUTHENTICATION & USER MANAGEMENT
Purpose: Secure access control and user administration
Features:
- Login/logout with username and password
- Role-based access: Admin, Supervisor, Technician
- User profile management
- Password reset functionality
- Session management
- Multi-factor authentication (optional future enhancement)

MODULE 2: TECHNICIAN MANAGEMENT
Purpose: Manage technician information and home locations
Features:
- Technician profiles (name, phone, email)
- Home address (Stop 0 for route optimization)
- Vehicle information (own vehicle vs company vehicle)
- Work schedule and availability
- Skills and certifications
- Performance metrics

MODULE 3: CUSTOMER MANAGEMENT
Purpose: Maintain customer database and service history
Features:
- Customer profiles (name, address, phone, email)
- Service address geocoding
- Service history timeline
- Notes and special instructions
- Preferred contact methods
- Customer equipment inventory

MODULE 4: APPLIANCE & EQUIPMENT TRACKING
Purpose: Track customer-owned appliances and equipment
Features:
- Equipment registry per customer
- Brand, model, serial number
- Purchase/installation date
- Warranty status
- Service history per appliance
- Common issues and solutions

MODULE 5: PDF ROUTE SHEET UPLOAD & PARSING
Purpose: Import daily route assignments from PDF documents
Features:
- Drag-and-drop PDF upload
- Automatic text extraction
- Parse job data:
  * Customer name
  * Service address (US format)
  * Phone numbers
  * Job number
  * Date and time window (e.g., "8AM TO 12PM")
  * Job type (TPA, OEM - Extended Warranty, etc.)
  * Product type (REFRIGERATOR, DISHWASHER, DRYER, etc.)
  * Problem description
  * Trip status (Scheduled, Arrived, etc.)
- Data validation and error handling
- Manual correction interface for parsing errors
- Bulk import confirmation

MODULE 6: GEOCODING SERVICE
Purpose: Convert US addresses to geographic coordinates
Features:
- Integration with Google Maps Geocoding API
- Batch geocoding for multiple addresses
- Address validation and standardization
- Coordinate caching to reduce API calls
- Fallback manual coordinate entry
- Accuracy verification

MODULE 7: ROUTE OPTIMIZATION ENGINE
Purpose: Calculate optimal route sequence for technician efficiency
Features:
- Starting point: Technician home address (Stop 0)
- Distance calculation between all points
- Time window constraints (e.g., 8AM-12PM, 4PM-5PM)
- Estimated service time by job type:
  * Diagnostic: 15 minutes
  * Part Replacement: 30 minutes
  * Major Job: 60 minutes
  * Custom time estimates
- Travel time calculation (using traffic data)
- Route sequence optimization (TSP algorithm)
- Multiple route comparison
- Manual route adjustment capability

OPTIMIZATION ALGORITHM APPROACH:
1. Nearest Neighbor heuristic for initial route
2. 2-opt improvement for route refinement
3. Time window validation
4. Alternative: Google Maps Directions API with waypoint optimization

MODULE 8: INTERACTIVE MAP VISUALIZATION
Purpose: Display routes and customer locations visually
Features:
- Interactive map using React-Leaflet
- Numbered markers for each stop (1, 2, 3...)
- Stop 0 (home) marked distinctly
- Route lines between sequential stops
- Hover tooltips showing:
  * Customer name
  * Address
  * Phone number
  * Appointment time window
  * Service type
  * Problem description (truncated)
- Color coding by job status:
  * Blue: Scheduled
  * Yellow: In Progress
  * Green: Completed
  * Red: Rescheduled/Parts Needed
- Click to expand full job details
- Turn-by-turn directions link
- Estimated arrival times

MODULE 9: JOB MANAGEMENT (TECHNICIAN VIEW)
Purpose: Enable technicians to manage their daily jobs
Features:
- Daily route view with stop sequence
- Job details for each stop
- Update trip status:
  * Scheduled
  * En Route
  * Arrived
  * In Progress
  * Completed
  * Rescheduled
- Capture service notes
- Record equipment information:
  * Brand (e.g., "Whirlpool", "GE", "Samsung")
  * Model number
  * Serial number
  * Appliance type (refrigerator, washer, dryer, etc.)
- Photo capture for parts and equipment
- Digital signature capture (customer sign-off)
- Time tracking (start time, end time)

MODULE 10: PARTS & INVENTORY MANAGEMENT
Purpose: Track parts needed and used in repairs
Features:
- Parts catalog
- Parts request from technician
- Photo upload of parts label/serial number
- Part number and description
- Quantity needed
- Urgency level
- Supplier information
- Parts order tracking
- Inventory levels
- Parts used per job

MODULE 11: RESCHEDULING & PROMISE DATES
Purpose: Manage appointments requiring parts or follow-up
Features:
- Mark job as "Parts Needed"
- Log required parts details
- Set promised return date and time window
- Technician availability check
- Auto-assign to future route
- Customer notification (optional)
- Parts arrival tracking
- Rescheduled job priority handling

MODULE 12: SUPERVISOR DASHBOARD
Purpose: Provide oversight and management capabilities
Features:
- Real-time view of all technicians
- Live technician locations (GPS tracking)
- Job status overview
- Performance metrics:
  * Jobs completed today
  * Average service time
  * Customer satisfaction ratings
- Reassign jobs to different technicians
- Add urgent/emergency jobs to routes
- View and approve parts requests
- Manage technician schedules
- Route analytics and reporting

MODULE 13: PARTS ORDERING (SUPERVISOR)
Purpose: Streamline parts procurement process
Features:
- Review parts requests from technicians
- Consolidate orders from multiple jobs
- Supplier selection
- Purchase order generation
- Order tracking
- Parts delivery confirmation
- Update job status when parts arrive
- Cost tracking

MODULE 14: PRICING & PAYMENT CONFIGURATION
Purpose: Define payment rules for technician compensation
Features:
- Rate configuration:
  * Technician with own vehicle: Rate A
  * Technician with company vehicle: Rate B
- Job type pricing:
  * Diagnostic: Price 1
  * Part replacement: Price 2
  * Major job: Price 3
  * Flat rate vs. hourly
- Mileage reimbursement (for own vehicle)
- Bonus structures
- Overtime rules
- Payment period configuration (weekly, bi-weekly)

MODULE 15: WEEKLY EARNINGS CALCULATION
Purpose: Calculate and track technician compensation
Features:
- Track completed jobs per week
- Calculate earnings based on:
  * Job type
  * Vehicle type (own vs. company)
  * Mileage (if applicable)
  * Bonuses
- Pending payment report
- Payment history
- Detailed breakdown per job
- Export to payroll system
- Tax and deduction handling (optional)

MODULE 16: VISIT HISTORY & TIMELINE
Purpose: Comprehensive service history tracking
Features:
- Complete service timeline per customer
- Visit log with details:
  * Date and time
  * Technician name
  * Services performed
  * Parts used
  * Time spent
  * Photos taken
  * Customer notes
- Search and filter capabilities:
  * By customer
  * By date range
  * By technician
  * By appliance type
  * By service status
- Export to PDF or CSV
- Performance analytics

MODULE 17: KNOWLEDGE BASE / WIKI
Purpose: Shared repository of troubleshooting guides and best practices
Features:
- Article creation and editing (WYSIWYG or Markdown)
- Categories and tags:
  * By appliance type
  * By brand
  * By problem type
- Search functionality
- Featured/pinned articles
- Most viewed articles
- User contributions
- Versioning and revision history
- Comments and discussions
- Attachments (diagrams, photos, PDFs)
- Access control (public vs. technician-only)

MODULE 18: NOTIFICATIONS & ALERTS
Purpose: Keep users informed of important events
Features:
- New job assignment notifications
- Route changes
- Parts arrival alerts
- Customer messages
- Emergency/urgent job alerts
- Daily route summary
- End-of-week earnings summary
- Email and/or SMS notifications
- In-app notification center
- Notification preferences

MODULE 19: ANALYTICS & REPORTING
Purpose: Business intelligence and performance tracking
Features:
- Technician performance metrics
- Job completion rates
- Average service times by job type
- Customer satisfaction trends
- Parts usage analysis
- Route efficiency metrics
- Revenue and earnings reports
- Custom date range selection
- Export capabilities
- Visual charts and graphs
- Comparison over time

MODULE 20: MOBILE-RESPONSIVE DESIGN
Purpose: Ensure usability on mobile devices for field technicians
Features:
- Mobile-first design approach
- Touch-friendly interface
- Offline capability (progressive web app)
- GPS integration for location tracking
- Camera access for photo capture
- Responsive layouts for all screen sizes
- Native-like experience
- Fast loading times
- Minimal data usage

================================================================================
6. USER ROLES & PERMISSIONS
================================================================================

ADMINISTRATOR
Permissions:
- Full system access
- User management (create, edit, delete)
- System configuration
- Pricing and payment rules
- Access to all reports and analytics
- Database maintenance

SUPERVISOR
Permissions:
- View all technicians and routes
- Reassign jobs
- Approve parts orders
- View and generate reports
- Manage schedules
- Monitor real-time job status
- Access customer and job history
- Cannot modify system configuration or user roles

TECHNICIAN
Permissions:
- View assigned routes
- Update job status
- Capture photos and notes
- Request parts
- View own schedule
- View customer information for assigned jobs
- View knowledge base
- Limited reporting (own performance)
- Cannot reassign jobs
- Cannot access other technicians' data

CUSTOMER (FUTURE ENHANCEMENT)
Permissions:
- View appointment status
- Reschedule appointments (within parameters)
- View service history
- Rate and review technicians
- Update contact information

================================================================================
7. KEY FEATURES OVERVIEW
================================================================================

CORE VALUE PROPOSITIONS:

1. ROUTE OPTIMIZATION
   - Save 20-30% on drive time and fuel costs
   - Increase daily job capacity by 15-25%
   - Reduce technician fatigue and stress
   - Improve on-time arrival rates

2. STREAMLINED WORKFLOW
   - Eliminate manual route planning
   - Reduce administrative overhead
   - Faster parts ordering and tracking
   - Paperless job documentation

3. IMPROVED VISIBILITY
   - Real-time job status for supervisors
   - Complete service history per customer
   - Performance analytics for continuous improvement
   - Proactive issue identification

4. ENHANCED CUSTOMER EXPERIENCE
   - More accurate arrival time estimates
   - Faster service completion
   - Comprehensive service documentation
   - Consistent service quality

5. KNOWLEDGE SHARING
   - Reduce training time for new technicians
   - Standardize best practices
   - Quick reference for troubleshooting
   - Continuous learning culture

COMPETITIVE ADVANTAGES:
- Industry-specific design for appliance repair
- US address optimization
- Bilingual support (English/Spanish)
- Mobile-first approach for field technicians
- Integrated parts management
- Fair and transparent technician compensation

FUTURE ENHANCEMENTS:
- Customer portal for self-service
- SMS notifications for customers
- Integration with warranty providers
- Inventory forecasting using machine learning
- Voice-to-text for notes while driving
- Augmented reality for repair guidance
- Integration with accounting software (QuickBooks, etc.)
- White-label capability for branding

================================================================================
END OF DOCUMENT
================================================================================

For questions or clarification, please contact the development team.

Document prepared by: Replit AI Agent
Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
`;
  };

  const getDatabaseContent = () => {
    return `
================================================================================
TECHROUTE MANAGER - DATABASE SCHEMA & API SPECIFICATION
================================================================================

Document Version: 1.0
Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

================================================================================
TABLE OF CONTENTS
================================================================================

1. DATABASE SCHEMA OVERVIEW
2. TABLE DEFINITIONS
3. RELATIONSHIPS & CONSTRAINTS
4. API ENDPOINTS SPECIFICATION
5. AUTHENTICATION & SECURITY

================================================================================
1. DATABASE SCHEMA OVERVIEW
================================================================================

DATABASE: PostgreSQL 14+
ORM: Drizzle ORM with TypeScript
MIGRATION TOOL: Drizzle Kit

TOTAL TABLES: 15

CORE ENTITIES:
- users (technicians, supervisors, admins)
- customers
- appliances
- service_jobs
- routes
- route_stops

SUPPORTING ENTITIES:
- parts
- job_parts
- job_photos
- job_notes
- pricing_config
- technician_earnings
- wiki_articles
- notifications
- audit_logs

================================================================================
2. TABLE DEFINITIONS
================================================================================

TABLE: users
Purpose: Store all system users (technicians, supervisors, admins)
Columns:
  - id: SERIAL PRIMARY KEY
  - username: VARCHAR(100) NOT NULL UNIQUE
  - email: VARCHAR(255) NOT NULL UNIQUE
  - password_hash: VARCHAR(255) NOT NULL
  - full_name: VARCHAR(255) NOT NULL
  - role: VARCHAR(50) NOT NULL
      Values: 'admin', 'supervisor', 'technician'
  - phone: VARCHAR(20)
  - home_address: TEXT (for technicians - Stop 0)
  - home_latitude: DECIMAL(10, 8)
  - home_longitude: DECIMAL(11, 8)
  - vehicle_type: VARCHAR(50)
      Values: 'own', 'company', NULL
  - is_active: BOOLEAN DEFAULT TRUE
  - created_at: TIMESTAMP DEFAULT NOW()
  - updated_at: TIMESTAMP DEFAULT NOW()

Indexes:
  - INDEX idx_users_email ON users(email)
  - INDEX idx_users_role ON users(role)
  - INDEX idx_users_active ON users(is_active)


TABLE: customers
Purpose: Store customer information and service addresses
Columns:
  - id: SERIAL PRIMARY KEY
  - customer_name: VARCHAR(255) NOT NULL
  - service_address: TEXT NOT NULL
  - city: VARCHAR(100) NOT NULL
  - state: VARCHAR(2) NOT NULL (US state code)
  - zip_code: VARCHAR(10) NOT NULL
  - latitude: DECIMAL(10, 8)
  - longitude: DECIMAL(11, 8)
  - primary_phone: VARCHAR(20) NOT NULL
  - secondary_phone: VARCHAR(20)
  - email: VARCHAR(255)
  - special_instructions: TEXT
  - is_active: BOOLEAN DEFAULT TRUE
  - created_at: TIMESTAMP DEFAULT NOW()
  - updated_at: TIMESTAMP DEFAULT NOW()

Indexes:
  - INDEX idx_customers_name ON customers(customer_name)
  - INDEX idx_customers_zip ON customers(zip_code)
  - INDEX idx_customers_coords ON customers(latitude, longitude)


TABLE: appliances
Purpose: Track customer-owned appliances/equipment
Columns:
  - id: SERIAL PRIMARY KEY
  - customer_id: INTEGER NOT NULL REFERENCES customers(id)
  - appliance_type: VARCHAR(100) NOT NULL
      Examples: 'REFRIGERATOR', 'DISHWASHER', 'DRYER', 'WASHER', 'OVEN', 'MICROWAVE'
  - brand: VARCHAR(100)
  - model_number: VARCHAR(100)
  - serial_number: VARCHAR(100)
  - purchase_date: DATE
  - warranty_expiry: DATE
  - notes: TEXT
  - created_at: TIMESTAMP DEFAULT NOW()
  - updated_at: TIMESTAMP DEFAULT NOW()

Indexes:
  - INDEX idx_appliances_customer ON appliances(customer_id)
  - INDEX idx_appliances_type ON appliances(appliance_type)


TABLE: service_jobs
Purpose: Store individual service appointments and job details
Columns:
  - id: SERIAL PRIMARY KEY
  - job_number: VARCHAR(50) UNIQUE NOT NULL
  - customer_id: INTEGER NOT NULL REFERENCES customers(id)
  - appliance_id: INTEGER REFERENCES appliances(id)
  - assigned_technician_id: INTEGER REFERENCES users(id)
  - job_type: VARCHAR(100) NOT NULL
      Examples: 'TPA - Extended Warranty', 'OEM - Warranty', 'Cash Customer'
  - scheduled_date: DATE NOT NULL
  - time_window_start: TIME
  - time_window_end: TIME
  - actual_start_time: TIMESTAMP
  - actual_end_time: TIMESTAMP
  - problem_description: TEXT
  - diagnosis: TEXT
  - resolution: TEXT
  - trip_status: VARCHAR(50) NOT NULL DEFAULT 'scheduled'
      Values: 'scheduled', 'en_route', 'arrived', 'in_progress', 'completed', 
              'parts_needed', 'rescheduled', 'cancelled'
  - estimated_service_time: INTEGER (in minutes)
  - promise_date: DATE (if rescheduled)
  - promise_time_start: TIME
  - promise_time_end: TIME
  - service_charge: DECIMAL(10, 2)
  - created_at: TIMESTAMP DEFAULT NOW()
  - updated_at: TIMESTAMP DEFAULT NOW()

Indexes:
  - INDEX idx_jobs_number ON service_jobs(job_number)
  - INDEX idx_jobs_customer ON service_jobs(customer_id)
  - INDEX idx_jobs_technician ON service_jobs(assigned_technician_id)
  - INDEX idx_jobs_date ON service_jobs(scheduled_date)
  - INDEX idx_jobs_status ON service_jobs(trip_status)


TABLE: routes
Purpose: Group jobs into optimized daily routes
Columns:
  - id: SERIAL PRIMARY KEY
  - route_name: VARCHAR(255) NOT NULL
  - technician_id: INTEGER NOT NULL REFERENCES users(id)
  - route_date: DATE NOT NULL
  - start_location_latitude: DECIMAL(10, 8) (usually technician home)
  - start_location_longitude: DECIMAL(11, 8)
  - total_distance_miles: DECIMAL(10, 2)
  - total_estimated_time_minutes: INTEGER
  - route_status: VARCHAR(50) DEFAULT 'planned'
      Values: 'planned', 'in_progress', 'completed'
  - optimized: BOOLEAN DEFAULT FALSE
  - created_at: TIMESTAMP DEFAULT NOW()
  - updated_at: TIMESTAMP DEFAULT NOW()

Indexes:
  - INDEX idx_routes_technician ON routes(technician_id)
  - INDEX idx_routes_date ON routes(route_date)


TABLE: route_stops
Purpose: Define the sequence of jobs within a route
Columns:
  - id: SERIAL PRIMARY KEY
  - route_id: INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE
  - service_job_id: INTEGER NOT NULL REFERENCES service_jobs(id)
  - stop_sequence: INTEGER NOT NULL
  - estimated_arrival_time: TIME
  - distance_from_previous_miles: DECIMAL(10, 2)
  - travel_time_from_previous_minutes: INTEGER
  - created_at: TIMESTAMP DEFAULT NOW()

Indexes:
  - INDEX idx_route_stops_route ON route_stops(route_id)
  - INDEX idx_route_stops_sequence ON route_stops(route_id, stop_sequence)
  - UNIQUE INDEX idx_route_stops_unique ON route_stops(route_id, service_job_id)


TABLE: parts
Purpose: Catalog of available parts/inventory
Columns:
  - id: SERIAL PRIMARY KEY
  - part_number: VARCHAR(100) UNIQUE NOT NULL
  - part_name: VARCHAR(255) NOT NULL
  - description: TEXT
  - compatible_appliances: TEXT[] (array of appliance types)
  - supplier: VARCHAR(255)
  - unit_cost: DECIMAL(10, 2)
  - quantity_in_stock: INTEGER DEFAULT 0
  - reorder_level: INTEGER DEFAULT 5
  - created_at: TIMESTAMP DEFAULT NOW()
  - updated_at: TIMESTAMP DEFAULT NOW()

Indexes:
  - INDEX idx_parts_number ON parts(part_number)
  - INDEX idx_parts_name ON parts(part_name)


TABLE: job_parts
Purpose: Track parts needed/used for each job
Columns:
  - id: SERIAL PRIMARY KEY
  - service_job_id: INTEGER NOT NULL REFERENCES service_jobs(id)
  - part_id: INTEGER REFERENCES parts(id)
  - part_description: VARCHAR(255) (if not in catalog)
  - quantity_needed: INTEGER NOT NULL DEFAULT 1
  - quantity_used: INTEGER DEFAULT 0
  - part_status: VARCHAR(50) DEFAULT 'needed'
      Values: 'needed', 'ordered', 'received', 'installed'
  - order_date: DATE
  - received_date: DATE
  - installed_date: DATE
  - cost: DECIMAL(10, 2)
  - notes: TEXT
  - created_at: TIMESTAMP DEFAULT NOW()

Indexes:
  - INDEX idx_job_parts_job ON job_parts(service_job_id)
  - INDEX idx_job_parts_part ON job_parts(part_id)
  - INDEX idx_job_parts_status ON job_parts(part_status)


TABLE: job_photos
Purpose: Store photos taken during service calls
Columns:
  - id: SERIAL PRIMARY KEY
  - service_job_id: INTEGER NOT NULL REFERENCES service_jobs(id)
  - photo_url: VARCHAR(500) NOT NULL
  - photo_type: VARCHAR(50)
      Values: 'equipment_label', 'part_needed', 'before_repair', 'after_repair', 'other'
  - caption: TEXT
  - uploaded_by: INTEGER REFERENCES users(id)
  - created_at: TIMESTAMP DEFAULT NOW()

Indexes:
  - INDEX idx_job_photos_job ON job_photos(service_job_id)


TABLE: job_notes
Purpose: Service notes and technician comments
Columns:
  - id: SERIAL PRIMARY KEY
  - service_job_id: INTEGER NOT NULL REFERENCES service_jobs(id)
  - note_text: TEXT NOT NULL
  - note_type: VARCHAR(50) DEFAULT 'general'
      Values: 'general', 'diagnosis', 'customer_request', 'follow_up'
  - created_by: INTEGER REFERENCES users(id)
  - is_visible_to_customer: BOOLEAN DEFAULT FALSE
  - created_at: TIMESTAMP DEFAULT NOW()

Indexes:
  - INDEX idx_job_notes_job ON job_notes(service_job_id)


TABLE: pricing_config
Purpose: Store pricing rules for technician compensation
Columns:
  - id: SERIAL PRIMARY KEY
  - config_name: VARCHAR(255) NOT NULL
  - vehicle_type: VARCHAR(50) NOT NULL
      Values: 'own', 'company'
  - job_type: VARCHAR(100)
  - rate_type: VARCHAR(50) NOT NULL
      Values: 'flat_rate', 'hourly', 'per_job'
  - rate_amount: DECIMAL(10, 2) NOT NULL
  - mileage_rate: DECIMAL(5, 2) (cents per mile for own vehicle)
  - effective_date: DATE NOT NULL
  - expiry_date: DATE
  - is_active: BOOLEAN DEFAULT TRUE
  - created_at: TIMESTAMP DEFAULT NOW()

Indexes:
  - INDEX idx_pricing_vehicle ON pricing_config(vehicle_type)
  - INDEX idx_pricing_active ON pricing_config(is_active)


TABLE: technician_earnings
Purpose: Track weekly/period earnings for technicians
Columns:
  - id: SERIAL PRIMARY KEY
  - technician_id: INTEGER NOT NULL REFERENCES users(id)
  - period_start_date: DATE NOT NULL
  - period_end_date: DATE NOT NULL
  - total_jobs_completed: INTEGER DEFAULT 0
  - total_miles_driven: DECIMAL(10, 2)
  - base_earnings: DECIMAL(10, 2) DEFAULT 0
  - mileage_reimbursement: DECIMAL(10, 2) DEFAULT 0
  - bonuses: DECIMAL(10, 2) DEFAULT 0
  - total_earnings: DECIMAL(10, 2) DEFAULT 0
  - payment_status: VARCHAR(50) DEFAULT 'pending'
      Values: 'pending', 'approved', 'paid'
  - payment_date: DATE
  - notes: TEXT
  - created_at: TIMESTAMP DEFAULT NOW()

Indexes:
  - INDEX idx_earnings_technician ON technician_earnings(technician_id)
  - INDEX idx_earnings_period ON technician_earnings(period_start_date, period_end_date)
  - INDEX idx_earnings_status ON technician_earnings(payment_status)


TABLE: wiki_articles
Purpose: Knowledge base articles for troubleshooting and best practices
Columns:
  - id: SERIAL PRIMARY KEY
  - title: VARCHAR(255) NOT NULL
  - content: TEXT NOT NULL
  - category: VARCHAR(100)
      Examples: 'refrigeration', 'laundry', 'cooking', 'dishwashing'
  - tags: TEXT[] (array of tags)
  - author_id: INTEGER REFERENCES users(id)
  - view_count: INTEGER DEFAULT 0
  - is_featured: BOOLEAN DEFAULT FALSE
  - is_published: BOOLEAN DEFAULT TRUE
  - created_at: TIMESTAMP DEFAULT NOW()
  - updated_at: TIMESTAMP DEFAULT NOW()

Indexes:
  - INDEX idx_wiki_category ON wiki_articles(category)
  - INDEX idx_wiki_published ON wiki_articles(is_published)
  - INDEX idx_wiki_featured ON wiki_articles(is_featured)


TABLE: notifications
Purpose: System notifications for users
Columns:
  - id: SERIAL PRIMARY KEY
  - user_id: INTEGER NOT NULL REFERENCES users(id)
  - notification_type: VARCHAR(50) NOT NULL
      Values: 'job_assigned', 'route_changed', 'parts_arrived', 'urgent_job', 'message'
  - title: VARCHAR(255) NOT NULL
  - message: TEXT
  - link_url: VARCHAR(500)
  - is_read: BOOLEAN DEFAULT FALSE
  - created_at: TIMESTAMP DEFAULT NOW()

Indexes:
  - INDEX idx_notifications_user ON notifications(user_id)
  - INDEX idx_notifications_unread ON notifications(user_id, is_read)


TABLE: audit_logs
Purpose: Track important system actions for compliance and debugging
Columns:
  - id: SERIAL PRIMARY KEY
  - user_id: INTEGER REFERENCES users(id)
  - action: VARCHAR(100) NOT NULL
  - entity_type: VARCHAR(50)
  - entity_id: INTEGER
  - details: JSONB
  - ip_address: VARCHAR(45)
  - created_at: TIMESTAMP DEFAULT NOW()

Indexes:
  - INDEX idx_audit_user ON audit_logs(user_id)
  - INDEX idx_audit_date ON audit_logs(created_at)
  - INDEX idx_audit_entity ON audit_logs(entity_type, entity_id)

================================================================================
3. RELATIONSHIPS & CONSTRAINTS
================================================================================

FOREIGN KEY RELATIONSHIPS:

customers → appliances (1:many)
  - One customer can have multiple appliances

customers → service_jobs (1:many)
  - One customer can have multiple service jobs

appliances → service_jobs (1:many)
  - One appliance can have multiple service jobs

users → service_jobs (1:many)
  - One technician can be assigned to multiple jobs

users → routes (1:many)
  - One technician can have multiple routes

routes → route_stops (1:many)
  - One route has multiple stops

service_jobs → route_stops (1:many)
  - One job can appear in multiple routes (rescheduled)

service_jobs → job_parts (1:many)
  - One job can require multiple parts

service_jobs → job_photos (1:many)
  - One job can have multiple photos

service_jobs → job_notes (1:many)
  - One job can have multiple notes

parts → job_parts (1:many)
  - One part can be used in multiple jobs

users → wiki_articles (1:many)
  - One user can author multiple articles

users → notifications (1:many)
  - One user can receive multiple notifications

CASCADING DELETES:

- DELETE route → CASCADE delete route_stops
- DELETE customer → RESTRICT if has service_jobs
- DELETE technician → RESTRICT if has assigned jobs

DATA INTEGRITY RULES:

- Users with role 'technician' must have home_address
- Service jobs must have either appliance_id or problem_description
- Route stops must have sequential numbering within route
- Pricing config dates must not overlap for same vehicle_type
- Technician earnings period dates must not overlap

================================================================================
4. API ENDPOINTS SPECIFICATION
================================================================================

BASE URL: /api/v1

AUTHENTICATION:
All endpoints require JWT token in Authorization header:
Authorization: Bearer <token>

RESPONSE FORMAT:
Success: { "success": true, "data": {...} }
Error: { "success": false, "error": "Error message" }

---

AUTHENTICATION ENDPOINTS:

POST /auth/login
Request: { "username": "string", "password": "string" }
Response: { "token": "jwt_token", "user": {...} }

POST /auth/logout
Request: Authorization header
Response: { "success": true }

POST /auth/change-password
Request: { "current_password": "string", "new_password": "string" }
Response: { "success": true }

---

USER ENDPOINTS:

GET /users
Query params: ?role=technician&is_active=true
Response: { "users": [...] }

GET /users/:id
Response: { "user": {...} }

POST /users
Request: { "username", "email", "password", "full_name", "role", ... }
Response: { "user": {...} }

PUT /users/:id
Request: { "full_name", "phone", "home_address", ... }
Response: { "user": {...} }

DELETE /users/:id
Response: { "success": true }

---

CUSTOMER ENDPOINTS:

GET /customers
Query params: ?search=name&state=NC&zip=28560
Response: { "customers": [...] }

GET /customers/:id
Response: { "customer": {...}, "appliances": [...], "service_history": [...] }

POST /customers
Request: { "customer_name", "service_address", "city", "state", "zip_code", "primary_phone", ... }
Response: { "customer": {...} }

PUT /customers/:id
Request: { "customer_name", "service_address", ... }
Response: { "customer": {...} }

DELETE /customers/:id
Response: { "success": true }

---

APPLIANCE ENDPOINTS:

GET /appliances?customer_id=123
Response: { "appliances": [...] }

GET /appliances/:id
Response: { "appliance": {...} }

POST /appliances
Request: { "customer_id", "appliance_type", "brand", "model_number", "serial_number", ... }
Response: { "appliance": {...} }

PUT /appliances/:id
Request: { "appliance_type", "brand", ... }
Response: { "appliance": {...} }

DELETE /appliances/:id
Response: { "success": true }

---

SERVICE JOB ENDPOINTS:

GET /jobs
Query params: ?technician_id=5&status=scheduled&date=2025-11-20
Response: { "jobs": [...] }

GET /jobs/:id
Response: { "job": {...}, "customer": {...}, "appliance": {...}, "parts": [...], "photos": [...], "notes": [...] }

POST /jobs
Request: { "job_number", "customer_id", "scheduled_date", "problem_description", ... }
Response: { "job": {...} }

PUT /jobs/:id
Request: { "trip_status", "diagnosis", "resolution", ... }
Response: { "job": {...} }

PUT /jobs/:id/status
Request: { "trip_status": "in_progress", "actual_start_time": "2025-11-20T09:30:00" }
Response: { "job": {...} }

DELETE /jobs/:id
Response: { "success": true }

---

PDF UPLOAD & PARSING ENDPOINTS:

POST /jobs/upload-route-sheet
Request: multipart/form-data with PDF file
Response: { "jobs": [...extracted_jobs...], "errors": [...parsing_errors...] }

POST /jobs/confirm-import
Request: { "jobs": [...validated_jobs...] }
Response: { "imported_count": 18, "jobs": [...] }

---

ROUTE ENDPOINTS:

GET /routes
Query params: ?technician_id=5&date=2025-11-20
Response: { "routes": [...] }

GET /routes/:id
Response: { "route": {...}, "stops": [...jobs_with_sequence...] }

POST /routes
Request: { "route_name", "technician_id", "route_date", "job_ids": [1,2,3,4] }
Response: { "route": {...} }

POST /routes/:id/optimize
Request: { "start_latitude": 35.12, "start_longitude": -77.04 }
Response: { "route": {...}, "optimized_stops": [...], "total_distance": 45.3, "total_time": 180 }

PUT /routes/:id
Request: { "route_name", ... }
Response: { "route": {...} }

PUT /routes/:id/reorder-stops
Request: { "stop_sequence": [{"job_id": 1, "sequence": 1}, {"job_id": 3, "sequence": 2}, ...] }
Response: { "route": {...}, "stops": [...] }

DELETE /routes/:id
Response: { "success": true }

---

GEOCODING ENDPOINT:

POST /geocode/address
Request: { "address": "2823 ASHLAND AVE", "city": "New Bern", "state": "NC", "zip": "28560" }
Response: { "latitude": 35.1234, "longitude": -77.0456, "formatted_address": "..." }

POST /geocode/batch
Request: { "addresses": [{...}, {...}, ...] }
Response: { "results": [{"latitude": ..., "longitude": ...}, ...] }

---

PARTS ENDPOINTS:

GET /parts
Query params: ?search=filter&compatible_with=REFRIGERATOR
Response: { "parts": [...] }

GET /parts/:id
Response: { "part": {...} }

POST /parts
Request: { "part_number", "part_name", "description", ... }
Response: { "part": {...} }

PUT /parts/:id
Request: { "part_name", "unit_cost", "quantity_in_stock", ... }
Response: { "part": {...} }

---

JOB PARTS ENDPOINTS:

GET /jobs/:job_id/parts
Response: { "parts": [...] }

POST /jobs/:job_id/parts
Request: { "part_id", "quantity_needed", "part_description", "notes" }
Response: { "job_part": {...} }

PUT /job-parts/:id
Request: { "part_status": "received", "received_date": "2025-11-21" }
Response: { "job_part": {...} }

---

PHOTO UPLOAD ENDPOINTS:

POST /jobs/:job_id/photos
Request: multipart/form-data with image file + { "photo_type": "part_needed", "caption": "..." }
Response: { "photo": {...} }

DELETE /photos/:id
Response: { "success": true }

---

NOTES ENDPOINTS:

GET /jobs/:job_id/notes
Response: { "notes": [...] }

POST /jobs/:job_id/notes
Request: { "note_text", "note_type", "is_visible_to_customer" }
Response: { "note": {...} }

---

PRICING CONFIG ENDPOINTS:

GET /pricing-config
Query params: ?vehicle_type=own&is_active=true
Response: { "configs": [...] }

POST /pricing-config
Request: { "config_name", "vehicle_type", "rate_type", "rate_amount", ... }
Response: { "config": {...} }

PUT /pricing-config/:id
Request: { "rate_amount", "is_active", ... }
Response: { "config": {...} }

---

EARNINGS ENDPOINTS:

GET /earnings
Query params: ?technician_id=5&period_start=2025-11-18&period_end=2025-11-24
Response: { "earnings": [...] }

GET /earnings/:id
Response: { "earning": {...}, "job_details": [...] }

POST /earnings/calculate
Request: { "technician_id", "period_start_date", "period_end_date" }
Response: { "earning": {...}, "breakdown": [...] }

PUT /earnings/:id
Request: { "payment_status": "paid", "payment_date": "2025-11-25" }
Response: { "earning": {...} }

---

WIKI ENDPOINTS:

GET /wiki/articles
Query params: ?category=refrigeration&search=ice+maker
Response: { "articles": [...] }

GET /wiki/articles/:id
Response: { "article": {...} }

POST /wiki/articles
Request: { "title", "content", "category", "tags": [...] }
Response: { "article": {...} }

PUT /wiki/articles/:id
Request: { "title", "content", "is_published", ... }
Response: { "article": {...} }

DELETE /wiki/articles/:id
Response: { "success": true }

---

NOTIFICATION ENDPOINTS:

GET /notifications
Query params: ?is_read=false
Response: { "notifications": [...] }

PUT /notifications/:id/read
Response: { "notification": {...} }

PUT /notifications/mark-all-read
Response: { "success": true }

---

ANALYTICS ENDPOINTS:

GET /analytics/technician-performance
Query params: ?technician_id=5&start_date=2025-11-01&end_date=2025-11-30
Response: { "total_jobs": 45, "avg_service_time": 52, "completion_rate": 0.95, ... }

GET /analytics/route-efficiency
Query params: ?start_date=2025-11-01&end_date=2025-11-30
Response: { "avg_route_distance": 48.2, "avg_jobs_per_route": 8.5, ... }

GET /analytics/customer-satisfaction
Query params: ?start_date=2025-11-01&end_date=2025-11-30
Response: { "avg_rating": 4.7, "total_reviews": 123, ... }

================================================================================
5. AUTHENTICATION & SECURITY
================================================================================

AUTHENTICATION STRATEGY: JWT (JSON Web Tokens)

LOGIN FLOW:
1. User submits username + password to POST /auth/login
2. Server validates credentials (bcrypt password comparison)
3. Server generates JWT token with payload:
   {
     "user_id": 123,
     "username": "john.technician",
     "role": "technician",
     "exp": 1732147200 (24 hour expiry)
   }
4. Client stores token (localStorage or secure cookie)
5. Client includes token in Authorization header for subsequent requests

TOKEN VALIDATION:
- All protected endpoints verify JWT signature
- Check token expiration
- Extract user info from token payload
- No database lookup needed for each request (stateless)

ROLE-BASED ACCESS CONTROL (RBAC):

Admin:
  - Full access to all endpoints
  - User management
  - System configuration

Supervisor:
  - Read access to all jobs, routes, customers
  - Update jobs (reassign)
  - Approve parts orders
  - View all analytics

Technician:
  - Read own assigned jobs and routes
  - Update job status for assigned jobs
  - Upload photos and notes
  - Request parts
  - Limited analytics (own performance)

ENDPOINT PROTECTION EXAMPLES:

GET /jobs/:id
  - Technicians: Only if job.assigned_technician_id === token.user_id
  - Supervisors/Admins: All jobs

PUT /jobs/:id/status
  - Technicians: Only if assigned to job
  - Supervisors/Admins: Any job

POST /users
  - Admins only

PASSWORD SECURITY:
- Minimum length: 8 characters
- Hash algorithm: bcrypt with cost factor 10
- Password reset via secure token (email)

DATA ENCRYPTION:
- HTTPS/TLS for all communications
- Database encryption at rest (provider-level)
- Sensitive fields (SSN if added) encrypted in database

INPUT VALIDATION:
- Zod schemas for all request bodies
- SQL injection prevention via parameterized queries (Drizzle ORM)
- XSS prevention via output encoding
- File upload validation (file type, size limits)

RATE LIMITING:
- API rate limits per user: 100 requests/minute
- Login attempts: 5 failed attempts = 15 minute lockout
- File upload limits: 10 MB per file, 50 MB per day

AUDIT LOGGING:
- Log all write operations (CREATE, UPDATE, DELETE)
- Log authentication events (login, logout, failed attempts)
- Log sensitive data access
- Retention: 1 year

================================================================================
END OF DOCUMENT
================================================================================
`;
  };

  const getImplementationContent = () => {
    return `
================================================================================
TECHROUTE MANAGER - IMPLEMENTATION GUIDE
================================================================================

Document Version: 1.0
Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

================================================================================
TABLE OF CONTENTS
================================================================================

1. PDF PROCESSING SYSTEM
2. ROUTE OPTIMIZATION ALGORITHM
3. WORKFLOW DIAGRAMS
4. IMPLEMENTATION TIMELINE (6 PHASES)
5. UI/UX GUIDELINES
6. DEPLOYMENT GUIDE
7. SAMPLE DATA (BASED ON PROVIDED PDF)

================================================================================
1. PDF PROCESSING SYSTEM
================================================================================

PURPOSE:
Extract structured job data from daily route sheet PDFs uploaded by supervisors.

EXAMPLE INPUT (from provided PDF):
---
# 1 Michel LAHOUDN
Customer: DONNA MORAN
Address: 2823 ASHLAND AVE, New Bern, NC 28560
Phone: 252 571 3954 Secondary Phone: 252 571 3954
Job: 29227 Date/Time: 10/24/2025 08:00 AM TO 09:00 AM 
Job Type: TPA - Extended Warranty - Residential
Description: Ice maker not working properly
Product: RESIDENTIAL REFRIGERATION
Trip Status: Scheduled
---

PARSING STRATEGY:

Step 1: Text Extraction
- Use pdf-parse library to extract raw text from PDF
- Handle multi-page PDFs
- Preserve line breaks and formatting

Step 2: Pattern Matching
Use regular expressions to extract fields:

const jobPattern = /# (\\d+) ([\\w\\s]+)\\s+Customer: ([^\\n]+)\\s+Address: ([^\\n]+)\\s+Phone: ([\\d\\s]+)(?:Secondary Phone: ([\\d\\s]+))?\\s+Job: ([\\d]+)\\s+Date\\/Time: ([^\\n]+)\\s+Job Type: ([^\\n]+)\\s+Description: ([^\\n]+)\\s+Product: ([^\\n]+)\\s+Trip Status: ([^\\n]+)/g;

Extracted Fields:
1. Stop Number: # 1
2. Technician Name: Michel LAHOUDN
3. Customer Name: DONNA MORAN
4. Address: 2823 ASHLAND AVE, New Bern, NC 28560
5. Primary Phone: 252 571 3954
6. Secondary Phone: 252 571 3954
7. Job Number: 29227
8. Date/Time: 10/24/2025 08:00 AM TO 09:00 AM
9. Job Type: TPA - Extended Warranty - Residential
10. Description: Ice maker not working properly
11. Product: RESIDENTIAL REFRIGERATION
12. Trip Status: Scheduled

Step 3: Address Parsing
Parse address into components:
- Street: 2823 ASHLAND AVE
- City: New Bern
- State: NC
- Zip: 28560

Regular expression:
const addressPattern = /^([^,]+),\\s*([^,]+),\\s*([A-Z]{2})\\s*(\\d{5})$/;

Step 4: Time Window Parsing
Parse time windows into start and end times:
- "08:00 AM TO 09:00 AM" → start: 08:00, end: 09:00
- "8AM TO 12PM" → start: 08:00, end: 12:00
- "12PM TO 4PM" → start: 12:00, end: 16:00

Step 5: Data Validation
- Verify all required fields are present
- Check address format is valid US address
- Validate phone numbers (10 digits)
- Ensure dates are valid
- Flag incomplete or ambiguous data for manual review

Step 6: Geocoding
- Send addresses to Google Maps Geocoding API
- Batch process to minimize API calls
- Cache coordinates for repeat addresses
- Handle geocoding failures gracefully

Step 7: Job Type Mapping
Map job type to estimated service time:
- First visit / Diagnostic: 15 minutes
- Part replacement: 30 minutes
- Major repair: 60 minutes
- Default: 30 minutes

IMPLEMENTATION EXAMPLE:

async function parsePDF(pdfBuffer: Buffer): Promise<ParsedJob[]> {
  // Extract text
  const pdfData = await pdf(pdfBuffer);
  const text = pdfData.text;
  
  // Split into individual jobs
  const jobBlocks = text.split(/(?=# \\d+ )/);
  
  const parsedJobs: ParsedJob[] = [];
  
  for (const block of jobBlocks) {
    if (!block.trim()) continue;
    
    const job = {
      stopNumber: extractStopNumber(block),
      technicianName: extractTechnicianName(block),
      customerName: extractCustomerName(block),
      address: extractAddress(block),
      phone: extractPhone(block),
      jobNumber: extractJobNumber(block),
      dateTime: extractDateTime(block),
      jobType: extractJobType(block),
      description: extractDescription(block),
      product: extractProduct(block),
      tripStatus: extractTripStatus(block)
    };
    
    // Geocode address
    const coords = await geocodeAddress(job.address);
    job.latitude = coords.lat;
    job.longitude = coords.lng;
    
    // Estimate service time
    job.estimatedServiceTime = estimateServiceTime(job.description, job.jobType);
    
    parsedJobs.push(job);
  }
  
  return parsedJobs;
}

ERROR HANDLING:
- If parsing fails for a job, flag it for manual entry
- Provide UI to review and correct parsed data before import
- Allow supervisors to edit any field
- Show confidence score for each extracted field

================================================================================
2. ROUTE OPTIMIZATION ALGORITHM
================================================================================

PROBLEM: Given N service jobs and a starting point (technician home), 
find the optimal sequence to visit all jobs minimizing total distance/time.

This is a variant of the Traveling Salesman Problem (TSP).

ALGORITHM: Nearest Neighbor with 2-Opt Improvement

STEP 1: NEAREST NEIGHBOR HEURISTIC
Starting from technician's home (Stop 0), repeatedly visit the nearest unvisited job.

Pseudocode:
---
current = technicianHome
route = [current]
unvisited = allJobs

while unvisited is not empty:
  nearest = null
  minDistance = infinity
  
  for each job in unvisited:
    distance = calculateDistance(current, job)
    
    # Check time window constraint
    estimatedArrival = currentTime + travelTime(current, job)
    if estimatedArrival > job.timeWindowEnd:
      continue  # Skip jobs we can't reach in time
    
    if distance < minDistance:
      minDistance = distance
      nearest = job
  
  if nearest is null:
    # No reachable jobs; try relaxing time windows
    break
  
  route.append(nearest)
  unvisited.remove(nearest)
  current = nearest
  currentTime = estimatedArrival + nearest.estimatedServiceTime

return route
---

STEP 2: 2-OPT IMPROVEMENT
Improve the route by reversing segments to reduce total distance.

Pseudocode:
---
improved = true

while improved:
  improved = false
  
  for i = 1 to route.length - 2:
    for j = i + 1 to route.length - 1:
      # Try reversing segment from i to j
      newRoute = route[0..i-1] + reverse(route[i..j]) + route[j+1..end]
      
      if totalDistance(newRoute) < totalDistance(route):
        route = newRoute
        improved = true
        break
    
    if improved:
      break

return route
---

STEP 3: TIME WINDOW VALIDATION
After optimization, verify all time windows are met.

for each job in route:
  if estimatedArrival < job.timeWindowStart:
    # Arrive early - add buffer time
  if estimatedArrival > job.timeWindowEnd:
    # Arrive late - flag for manual adjustment

STEP 4: CALCULATE ROUTE METRICS
- Total distance (sum of distances between consecutive stops)
- Total travel time (using Google Maps Directions API with traffic)
- Total service time (sum of estimatedServiceTime for all jobs)
- Estimated completion time

DISTANCE CALCULATION:
Use Haversine formula for initial estimates:

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

For final routing, use Google Maps Directions API for accurate road distances.

ALTERNATIVE: Google Maps Directions API with Waypoint Optimization
- Google Maps API supports up to 25 waypoints
- Set optimize:true parameter to let Google handle optimization
- Pros: Accurate, accounts for traffic, one-way streets, turn restrictions
- Cons: API costs, 25 waypoint limit

Example API call:
GET https://maps.googleapis.com/maps/api/directions/json?
  origin=35.1084,-77.0441&
  destination=35.1084,-77.0441&
  waypoints=optimize:true|35.1092,-77.0433|35.1234,-77.0456|...|
  key=YOUR_API_KEY

IMPLEMENTATION RECOMMENDATION:
- Use Nearest Neighbor + 2-Opt for routes with >25 jobs
- Use Google Maps optimization for routes with ≤25 jobs
- Cache route calculations to minimize API costs

================================================================================
3. WORKFLOW DIAGRAMS
================================================================================

WORKFLOW 1: DAILY ROUTE SETUP
---
1. [Supervisor] Upload PDF route sheet
2. [System] Parse PDF and extract job data
3. [System] Display parsed jobs for review
4. [Supervisor] Review and correct any parsing errors
5. [Supervisor] Confirm import
6. [System] Geocode all addresses (batch)
7. [System] Create jobs in database
8. [System] Assign jobs to technician
9. [System] Run route optimization algorithm
10. [System] Create optimized route
11. [System] Send notification to technician
12. [Technician] View route on mobile device
---

WORKFLOW 2: TECHNICIAN COMPLETING A JOB
---
1. [Technician] View daily route on mobile app
2. [Technician] Select next job in sequence
3. [Technician] Click "Navigate" (opens Google Maps)
4. [Technician] Drive to customer location
5. [Technician] Update status to "Arrived"
6. [Technician] Update status to "In Progress"
7. [Technician] Perform service/diagnosis
8. IF parts needed:
   a. [Technician] Capture photo of part label/serial
   b. [Technician] Enter part description
   c. [Technician] Set promise date for return visit
   d. [Technician] Update status to "Parts Needed"
9. ELSE:
   a. [Technician] Complete repair
   b. [Technician] Add service notes
   c. [Technician] Capture "after" photos
   d. [Technician] Update status to "Completed"
10. [Technician] Move to next job
---

WORKFLOW 3: PARTS ORDERING & RESCHEDULING
---
1. [Technician] Mark job as "Parts Needed"
2. [Technician] Upload photo and part details
3. [System] Create parts request
4. [System] Notify supervisor
5. [Supervisor] Review parts request
6. [Supervisor] Identify part in catalog or add new
7. [Supervisor] Order part from supplier
8. [Supervisor] Update parts status to "Ordered"
9. [System] Wait for part arrival
10. [Supplier] Ships part
11. [Supervisor] Update status to "Received"
12. [System] Check promise date for job
13. [System] Auto-assign job to technician's route on promise date
14. [System] Notify technician of rescheduled job
15. [Technician] Complete installation on return visit
---

WORKFLOW 4: WEEKLY EARNINGS CALCULATION
---
1. [System] At end of week (e.g., Sunday night)
2. [System] Query all jobs with status "Completed" for week
3. [System] Group jobs by technician
4. FOR each technician:
   a. Count total jobs completed
   b. Sum total miles driven (from route data)
   c. Get pricing config for technician's vehicle type
   d. Calculate base earnings (jobs × rate)
   e. IF vehicle_type = "own":
      - Calculate mileage reimbursement (miles × mileage_rate)
   f. Add any bonuses
   g. Calculate total_earnings = base + mileage + bonuses
   h. Create technician_earnings record
   i. Set payment_status = "pending"
5. [System] Notify supervisors of pending payments
6. [Supervisor] Review and approve earnings
7. [Supervisor] Update payment_status to "approved"
8. [System] Generate payment report
9. [Accounting] Process payment
10. [Supervisor] Update payment_status to "paid"
---

WORKFLOW 5: SUPERVISOR REASSIGNING A JOB
---
1. [Supervisor] View dashboard with all routes
2. [Supervisor] Identify job to reassign
   (Reason: technician sick, emergency job, overloaded route)
3. [Supervisor] Click "Reassign Job"
4. [System] Show available technicians for that date
5. [Supervisor] Select new technician
6. [System] Remove job from old route
7. [System] Add job to new technician's route
8. [System] Re-optimize new technician's route
9. [System] Notify both technicians of change
10. [Technicians] View updated routes
---

================================================================================
4. IMPLEMENTATION TIMELINE (6 PHASES)
================================================================================

TOTAL ESTIMATED TIME: 12-16 weeks for full implementation

PHASE 1: FOUNDATION (Weeks 1-2)
Tasks:
- Setup development environment
- Initialize React + TypeScript + Vite project
- Configure PostgreSQL database
- Setup Drizzle ORM and create initial schema
- Implement authentication (login/logout)
- Create basic user management
- Setup role-based access control
- Create basic layout and navigation

Deliverables:
- Working login system
- User CRUD operations
- Admin, Supervisor, Technician roles

PHASE 2: CUSTOMER & JOB MANAGEMENT (Weeks 3-4)
Tasks:
- Create customer management module
- Create appliance tracking module
- Create service job module
- Implement basic job CRUD operations
- Setup geocoding service
- Create customer detail page with service history

Deliverables:
- Customer database
- Appliance registry
- Manual job creation
- Address geocoding

PHASE 3: PDF PROCESSING & ROUTE OPTIMIZATION (Weeks 5-7)
Tasks:
- Implement PDF upload functionality
- Build PDF parser with regex extraction
- Create data review/correction UI
- Implement batch geocoding
- Build route optimization algorithm
- Create route management module
- Implement route stop sequencing

Deliverables:
- PDF route sheet import
- Automated job extraction
- Optimized route generation
- Route visualization (list view)

PHASE 4: MAP VISUALIZATION & MOBILE INTERFACE (Weeks 8-10)
Tasks:
- Integrate React-Leaflet
- Create interactive map with markers
- Implement hover tooltips
- Add route line drawing
- Build mobile-responsive technician interface
- Implement job status updates
- Create photo upload functionality
- Add service notes module

Deliverables:
- Interactive route map
- Mobile-friendly technician view
- Photo capture and upload
- Real-time job status updates

PHASE 5: PARTS & EARNINGS MANAGEMENT (Weeks 11-13)
Tasks:
- Create parts catalog module
- Implement parts request workflow
- Build parts ordering interface for supervisors
- Create promise date and rescheduling system
- Implement pricing configuration
- Build earnings calculation engine
- Create weekly earnings reports
- Add payment tracking

Deliverables:
- Parts management system
- Automated rescheduling
- Earnings calculation
- Payment reports

PHASE 6: KNOWLEDGE BASE & POLISH (Weeks 14-16)
Tasks:
- Create wiki/knowledge base module
- Implement article CRUD operations
- Add search and categories
- Build analytics dashboard
- Implement notifications system
- Add internationalization (i18n) for Spanish
- Performance optimization
- User acceptance testing
- Bug fixes and refinements
- Deploy to production

Deliverables:
- Knowledge base
- Analytics dashboard
- Notifications
- Bilingual support
- Production-ready application

POST-LAUNCH (Ongoing)
- User training
- Collect feedback
- Iterative improvements
- Feature enhancements

================================================================================
5. UI/UX GUIDELINES
================================================================================

DESIGN PRINCIPLES:

1. MOBILE-FIRST
   - Technicians primarily use mobile devices in the field
   - Optimize for touch interactions
   - Large buttons (minimum 44×44px touch targets)
   - Simple, uncluttered layouts
   - Minimize text input (use dropdowns, toggles, photo capture)

2. SUPERVISOR DESKTOP EXPERIENCE
   - Dashboard with overview of all routes
   - Multi-column layouts for efficiency
   - Keyboard shortcuts for common actions
   - Drag-and-drop for reassigning jobs
   - Data tables with sorting and filtering

3. VISUAL HIERARCHY
   - Critical information prominent (job status, customer name, address)
   - Secondary info available but not distracting
   - Color coding for status:
     * Blue: Scheduled
     * Yellow/Orange: In Progress
     * Green: Completed
     * Red: Parts Needed / Urgent

4. PROGRESSIVE DISCLOSURE
   - Show summary view by default
   - Expand for details on demand
   - Avoid overwhelming users with too much info at once

COLOR PALETTE:

Primary: Blue (#2563EB)
  - Use for primary actions, links, active states

Success: Green (#10B981)
  - Completed jobs, successful actions

Warning: Yellow/Orange (#F59E0B)
  - In-progress, pending actions

Error: Red (#EF4444)
  - Failed actions, urgent items, parts needed

Neutral: Gray scale
  - Text, backgrounds, borders

KEY SCREENS:

TECHNICIAN MOBILE APP:

1. Daily Route View
   - List of jobs in sequence
   - Each job card shows:
     * Stop number
     * Customer name
     * Address (truncated)
     * Time window
     * Estimated arrival time
     * Status badge
   - "Navigate" button
   - "Update Status" button

2. Job Detail View
   - Full customer info
   - Appliance details
   - Problem description
   - Service notes (add/view)
   - Photo gallery
   - Status update buttons
   - Parts request form

3. Map View
   - All jobs plotted as numbered markers
   - Route line connecting stops
   - Tap marker to see job summary
   - "Navigate to Next Stop" button

SUPERVISOR DESKTOP DASHBOARD:

1. Overview Page
   - Cards showing key metrics:
     * Jobs Completed Today
     * Jobs In Progress
     * Jobs Pending Parts
     * Technicians Active
   - List of all routes with status
   - Recent alerts/notifications

2. Route Management Page
   - Filters: Date, Technician, Status
   - Table of all routes
   - Click route to see details
   - Drag-and-drop jobs to reassign
   - "Optimize Route" button

3. Route Detail Page
   - Map showing all stops
   - Side panel with stop sequence
   - Reorder stops manually
   - Add/remove jobs
   - View technician info

4. Parts Management Page
   - Pending parts requests
   - Parts inventory
   - Order history
   - "Order Part" workflow

RESPONSIVE BREAKPOINTS:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

ACCESSIBILITY:
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- High contrast mode
- Focus indicators

PERFORMANCE:
- Page load < 2 seconds
- Smooth animations (60fps)
- Offline capability for technician app
- Image compression for uploads
- Lazy loading for long lists

================================================================================
6. DEPLOYMENT GUIDE
================================================================================

HOSTING OPTIONS:

Option 1: Replit (Recommended for MVP)
- Pros: Simple deployment, integrated database (Neon PostgreSQL)
- Cons: Limited scalability, shared resources
- Best for: Initial development and testing

Option 2: Vercel + Neon
- Frontend: Vercel
- Backend: Vercel Serverless Functions
- Database: Neon PostgreSQL (serverless)
- File Storage: Vercel Blob or S3
- Pros: Auto-scaling, global CDN, generous free tier
- Cons: Serverless functions have time limits (10s default)

Option 3: AWS (Production-Grade)
- Frontend: S3 + CloudFront
- Backend: EC2 or ECS
- Database: RDS PostgreSQL
- File Storage: S3
- Pros: Full control, scalability, enterprise features
- Cons: Higher cost, more complex setup

DEPLOYMENT STEPS (Vercel + Neon):

1. Setup Neon PostgreSQL
   - Create account at neon.tech
   - Create new project and database
   - Copy connection string

2. Setup Vercel
   - Create account at vercel.com
   - Connect GitHub repository
   - Configure build settings:
     * Build Command: npm run build
     * Output Directory: dist
     * Install Command: npm install

3. Environment Variables (Vercel Dashboard)
   - DATABASE_URL=postgresql://...
   - JWT_SECRET=your_secret_key
   - GOOGLE_MAPS_API_KEY=your_api_key
   - NODE_ENV=production

4. Database Migration
   - Run migrations: npx drizzle-kit push:pg
   - Seed initial data (admin user, pricing config)

5. Deploy
   - Push to main branch → auto-deploy
   - Or manual deploy via Vercel dashboard

6. Post-Deployment
   - Test all features in production
   - Monitor error logs
   - Setup custom domain
   - Configure SSL certificate (auto with Vercel)

MONITORING & MAINTENANCE:

- Error tracking: Sentry or Rollbar
- Analytics: Google Analytics or Plausible
- Uptime monitoring: UptimeRobot
- Logs: Vercel logs or CloudWatch (AWS)
- Backup: Daily database backups (automated with Neon)

SECURITY CHECKLIST:
✓ HTTPS enforced
✓ Environment variables secured
✓ API rate limiting enabled
✓ SQL injection prevention (parameterized queries)
✓ XSS protection (output encoding)
✓ CORS configured properly
✓ Authentication token secure
✓ Regular dependency updates
✓ Security headers (helmet.js)

================================================================================
7. SAMPLE DATA (BASED ON PROVIDED PDF)
================================================================================

TECHNICIAN:
{
  "id": 1,
  "username": "michel.lahoudn",
  "full_name": "Michel LAHOUDN",
  "role": "technician",
  "home_address": "123 Main St, New Bern, NC 28560",
  "home_latitude": 35.1084,
  "home_longitude": -77.0441,
  "vehicle_type": "company"
}

SAMPLE CUSTOMERS (from PDF):

Customer 1:
{
  "id": 1,
  "customer_name": "DONNA MORAN",
  "service_address": "2823 ASHLAND AVE",
  "city": "New Bern",
  "state": "NC",
  "zip_code": "28560",
  "latitude": 35.1092,
  "longitude": -77.0433,
  "primary_phone": "252 571 3954",
  "secondary_phone": "252 571 3954"
}

Customer 2:
{
  "id": 2,
  "customer_name": "TYREL GREENOUGH",
  "service_address": "209 BIG FISH RUN",
  "city": "Jacksonville",
  "state": "NC",
  "zip_code": "28540",
  "latitude": 34.7540,
  "longitude": -77.4305,
  "primary_phone": "808 321 4495",
  "secondary_phone": "808 321 4495"
}

Customer 3:
{
  "id": 3,
  "customer_name": "PAULA HARRIS",
  "service_address": "139 SILVER LEAF DR",
  "city": "Jacksonville",
  "state": "NC",
  "zip_code": "28546",
  "latitude": 34.8234,
  "longitude": -77.4156,
  "primary_phone": "910 381 1254",
  "secondary_phone": "910 381 1254"
}

SAMPLE SERVICE JOBS:

Job 1:
{
  "id": 1,
  "job_number": "29227",
  "customer_id": 1,
  "assigned_technician_id": 1,
  "job_type": "TPA - Extended Warranty - Residential",
  "scheduled_date": "2025-10-24",
  "time_window_start": "08:00:00",
  "time_window_end": "09:00:00",
  "problem_description": "Ice maker not working properly",
  "trip_status": "scheduled",
  "estimated_service_time": 15,
  "appliance_type": "RESIDENTIAL REFRIGERATION"
}

Job 2:
{
  "id": 2,
  "job_number": "29703",
  "customer_id": 2,
  "assigned_technician_id": 1,
  "job_type": "OEM - Warranty - Residential",
  "scheduled_date": "2025-10-24",
  "time_window_start": "08:00:00",
  "time_window_end": "12:00:00",
  "problem_description": "Other Not listed See Remarks:water pump",
  "trip_status": "scheduled",
  "estimated_service_time": 30,
  "appliance_type": "DISHWASHER - BUILT-IN"
}

Job 3:
{
  "id": 3,
  "job_number": "29874",
  "customer_id": 3,
  "assigned_technician_id": 1,
  "job_type": "TPA - Extended Warranty - Residential",
  "scheduled_date": "2025-10-24",
  "time_window_start": "08:00:00",
  "time_window_end": "12:00:00",
  "problem_description": "The refrigerator is unbalanced, and when you open the door, it swings and hits my cabinet",
  "trip_status": "scheduled",
  "estimated_service_time": 30,
  "appliance_type": "RESIDENTIAL REFRIGERATION"
}

SAMPLE ROUTE (after optimization):

{
  "id": 1,
  "route_name": "Michel - Oct 24, 2025",
  "technician_id": 1,
  "route_date": "2025-10-24",
  "start_location_latitude": 35.1084,
  "start_location_longitude": -77.0441,
  "total_distance_miles": 48.3,
  "total_estimated_time_minutes": 285,
  "route_status": "planned",
  "optimized": true
}

ROUTE STOPS (optimized sequence):

[
  {
    "route_id": 1,
    "service_job_id": 1,
    "stop_sequence": 1,
    "estimated_arrival_time": "08:15:00",
    "distance_from_previous_miles": 2.1,
    "travel_time_from_previous_minutes": 8
  },
  {
    "route_id": 1,
    "service_job_id": 3,
    "stop_sequence": 2,
    "estimated_arrival_time": "09:45:00",
    "distance_from_previous_miles": 18.4,
    "travel_time_from_previous_minutes": 35
  },
  {
    "route_id": 1,
    "service_job_id": 2,
    "stop_sequence": 3,
    "estimated_arrival_time": "11:20:00",
    "distance_from_previous_miles": 5.2,
    "travel_time_from_previous_minutes": 12
  }
]

PRICING CONFIG EXAMPLE:

{
  "id": 1,
  "config_name": "Standard Technician - Company Vehicle",
  "vehicle_type": "company",
  "rate_type": "per_job",
  "rate_amount": 45.00,
  "mileage_rate": null,
  "effective_date": "2025-01-01",
  "is_active": true
}

{
  "id": 2,
  "config_name": "Standard Technician - Own Vehicle",
  "vehicle_type": "own",
  "rate_type": "per_job",
  "rate_amount": 50.00,
  "mileage_rate": 0.655,
  "effective_date": "2025-01-01",
  "is_active": true
}

WEEKLY EARNINGS EXAMPLE:

{
  "technician_id": 1,
  "period_start_date": "2025-10-20",
  "period_end_date": "2025-10-26",
  "total_jobs_completed": 42,
  "total_miles_driven": 285.7,
  "base_earnings": 1890.00,
  "mileage_reimbursement": 0.00,
  "bonuses": 100.00,
  "total_earnings": 1990.00,
  "payment_status": "pending"
}

================================================================================
ADDITIONAL RESOURCES
================================================================================

API INTEGRATIONS:

1. Google Maps Geocoding API
   Documentation: https://developers.google.com/maps/documentation/geocoding
   Pricing: $5 per 1000 requests (first $200/month free)

2. Google Maps Directions API
   Documentation: https://developers.google.com/maps/documentation/directions
   Pricing: $5 per 1000 requests

3. OpenStreetMap (Free Alternative)
   Geocoding: Nominatim API (free, rate-limited)
   Routing: OpenRouteService or OSRM (free, self-hosted or API)

LIBRARIES & TOOLS:

- pdf-parse: https://www.npmjs.com/package/pdf-parse
- React-Leaflet: https://react-leaflet.js.org/
- Drizzle ORM: https://orm.drizzle.team/
- shadcn/ui: https://ui.shadcn.com/
- TanStack Query: https://tanstack.com/query
- react-i18next: https://react.i18next.com/

LEARNING RESOURCES:

- TSP Algorithms: https://en.wikipedia.org/wiki/Travelling_salesman_problem
- Route Optimization Best Practices: WorkWave, Routific blogs
- Field Service Management: Gartner research reports

================================================================================
END OF IMPLEMENTATION GUIDE
================================================================================

Good luck building TechRoute Manager!

For questions or support, consult the development team.

Document prepared by: Replit AI Agent
Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
`;
  };

  const downloadAllFiles = () => {
    downloadFile('01-ARCHITECTURE-AND-TECH-STACK.txt', getArchitectureContent());
    downloadFile('02-DATABASE-SCHEMA-AND-API.txt', getDatabaseContent());
    downloadFile('03-IMPLEMENTATION-GUIDE.txt', getImplementationContent());
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">TechRoute Manager</h1>
        <p className="text-muted-foreground text-lg">
          Complete Documentation Package
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Documentation Files
          </CardTitle>
          <CardDescription>
            Download the complete architectural documentation for your field service management application.
            These files contain everything you need to build TechRoute Manager from scratch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <div>
                    <h3 className="font-semibold">01-ARCHITECTURE-AND-TECH-STACK.txt</h3>
                    <p className="text-sm text-muted-foreground">
                      Executive summary, suggested names, system architecture, technology stack, and module breakdown
                    </p>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => downloadFile('01-ARCHITECTURE-AND-TECH-STACK.txt', getArchitectureContent())}
                variant="outline"
                size="sm"
                className="w-full mt-2"
                data-testid="download-architecture"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Architecture File
              </Button>
            </div>

            <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-green-500" />
                  <div>
                    <h3 className="font-semibold">02-DATABASE-SCHEMA-AND-API.txt</h3>
                    <p className="text-sm text-muted-foreground">
                      Complete database schema, table definitions, relationships, and API endpoints specification
                    </p>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => downloadFile('02-DATABASE-SCHEMA-AND-API.txt', getDatabaseContent())}
                variant="outline"
                size="sm"
                className="w-full mt-2"
                data-testid="download-database"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Database & API File
              </Button>
            </div>

            <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-purple-500" />
                  <div>
                    <h3 className="font-semibold">03-IMPLEMENTATION-GUIDE.txt</h3>
                    <p className="text-sm text-muted-foreground">
                      PDF processing, route optimization algorithm, workflows, implementation timeline, UI/UX guidelines, and deployment guide
                    </p>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => downloadFile('03-IMPLEMENTATION-GUIDE.txt', getImplementationContent())}
                variant="outline"
                size="sm"
                className="w-full mt-2"
                data-testid="download-implementation"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Implementation Guide
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button 
              onClick={downloadAllFiles}
              className="w-full"
              size="lg"
              data-testid="download-all"
            >
              <Download className="h-5 w-5 mr-2" />
              Download All 3 Files
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              All files will be downloaded as separate .txt files
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What's Included</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Application Name:</strong> TechRoute Manager (plus 5 alternatives)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Complete Architecture:</strong> Client-Server design with RESTful API</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Technology Stack:</strong> React, TypeScript, PostgreSQL, Express.js, Leaflet</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>20+ Modules:</strong> Detailed breakdown of all features and functionality</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Database Schema:</strong> 15 tables with full specifications</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>API Endpoints:</strong> Complete REST API specification</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>PDF Processing:</strong> How to parse route sheets (based on your example)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Route Optimization:</strong> Step-by-step algorithm explanation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>6-Phase Implementation Plan:</strong> 12-16 week timeline</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>UI/UX Guidelines:</strong> Mobile-first design principles</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Deployment Guide:</strong> Step-by-step production deployment</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Sample Data:</strong> Based on your uploaded PDF route sheet</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>Documentation generated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        <p className="mt-1">Ready to build outside of this application</p>
      </div>
    </div>
  );
}
