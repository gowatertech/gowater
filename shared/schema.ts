import { pgTable, text, serial, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users (drivers, admins, etc.)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", {
    enum: ["admin", "supervisor", "cashier", "driver", "assistant"]
  }).notNull(),
  active: boolean("active").notNull().default(true),
  phone: text("phone"),
  license: text("license"),
  licenseExpiry: timestamp("license_expiry", { mode: 'string' }),
  hireDate: timestamp("hire_date").notNull().defaultNow(),
  emergencyContact: text("emergency_contact"),
  currentLocation: text("current_location"),
  lastLocationUpdate: timestamp("last_location_update"),
});

export const insertUserSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  username: z.string().min(1, "El nombre de usuario es requerido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  role: z.enum(["admin", "supervisor", "cashier", "driver", "assistant"]),
  phone: z.string().optional(),
  license: z.string().optional(),
  licenseExpiry: z.string().optional(),
  emergencyContact: z.string().optional(),
  currentLocation: z.string().regex(/^-?\d+\.\d+,-?\d+\.\d+$/).optional(),
  active: z.boolean().default(true),
});

// Products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  icon: text("icon"),
  isReturnable: boolean("is_returnable").notNull().default(false),
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }).default("0.00"),
});

export const insertProductSchema = z.object({
  name: z.string().min(1, "El nombre del producto es requerido"),
  price: z.string().regex(/^\d+\.\d{2}$/, "El precio debe tener 2 decimales"),
  stock: z.number().default(0),
  icon: z.string().optional(),
  isReturnable: z.boolean().default(false),
  depositAmount: z.string().regex(/^\d+\.\d{2}$/).default("0.00"),
});

// Provincias y Municipios
export const provinces = pgTable("provinces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
});

export const municipalities = pgTable("municipalities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  provinceId: integer("province_id").notNull().references(() => provinces.id),
  type: text("type", { enum: ["municipality", "district"] }).notNull(),
});

export const insertProvinceSchema = z.object({
  name: z.string().min(1, "El nombre de la provincia es requerido"),
  code: z.string().min(1, "El código de la provincia es requerido"),
});

export const insertMunicipalitySchema = z.object({
  name: z.string().min(1, "El nombre del municipio es requerido"),
  code: z.string().min(1, "El código del municipio es requerido"),
  provinceId: z.number({ required_error: "El ID de la provincia es requerido" }),
  type: z.enum(["municipality", "district"]),
});

// Relations
export const provincesRelations = relations(provinces, ({ many }) => ({
  municipalities: many(municipalities),
}));

export const municipalitiesRelations = relations(municipalities, ({ one }) => ({
  province: one(provinces, {
    fields: [municipalities.provinceId],
    references: [provinces.id],
  }),
}));

// Cities and Sectors
export const cities = pgTable("cities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  municipalityId: integer("municipality_id").notNull().references(() => municipalities.id),
  code: text("code").notNull().unique(),
});

export const sectors = pgTable("sectors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cityId: integer("city_id").notNull().references(() => cities.id),
  code: text("code").notNull().unique(),
});

export const insertCitySchema = z.object({
  name: z.string().min(1, "El nombre de la ciudad es requerido"),
  municipalityId: z.number({ required_error: "El ID del municipio es requerido" }),
  code: z.string().min(1, "El código de la ciudad es requerido"),
});

export const insertSectorSchema = z.object({
  name: z.string().min(1, "El nombre del sector es requerido"),
  cityId: z.number({ required_error: "El ID de la ciudad es requerido" }),
  code: z.string().min(1, "El código del sector es requerido"),
});


// Customers
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  logo: text("logo"),
  rnc: text("rnc"),
  businessname: text("businessname").notNull(),
  managername: text("managername").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  zoneid: integer("zoneid").references(() => zones.id),
  street: text("street").notNull(),
  streetnumber: text("streetnumber").notNull(),
  provinceid: integer("provinceid").notNull().references(() => provinces.id),
  municipalityid: integer("municipalityid").notNull().references(() => municipalities.id),
  reference: text("reference"),
  creditlimit: decimal("creditlimit", { precision: 10, scale: 2 }).notNull().default("0"),
});

export const insertCustomerSchema = z.object({
  logo: z.any().optional(),
  rnc: z.string().optional(),
  businessname: z.string().min(1, "El nombre del negocio es requerido"),
  managername: z.string().min(1, "El nombre del encargado es requerido"),
  phone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos"),
  email: z.union([z.string().email("Correo electrónico inválido"), z.null()]).optional(),
  zoneid: z.number().optional(),
  street: z.string().min(1, "La calle es requerida"),
  streetnumber: z.string().min(1, "El número es requerido"),
  provinceid: z.number({ required_error: "La provincia es requerida" }),
  municipalityid: z.number({ required_error: "El municipio es requerido" }),
  reference: z.string().optional(),
  creditlimit: z.string().regex(/^\d+\.\d{2}$/).default("0.00"),
});

// Trucks
export const trucks = pgTable("trucks", {
  id: serial("id").primaryKey(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  plate: text("plate").notNull().unique(),
  color: text("color").notNull(),
  capacity: integer("capacity").notNull(),
  status: text("status", { enum: ["disponible", "en_ruta", "mantenimiento"] }).notNull().default("disponible"),
});

export const insertTruckSchema = z.object({
  brand: z.string().min(1, "La marca es requerida"),
  model: z.string().min(1, "El modelo es requerido"),
  year: z.number().min(1990, "El año debe ser mayor a 1990"),
  plate: z.string().min(1, "La placa es requerida"),
  color: z.string().min(1, "El color es requerido"),
  capacity: z.number().min(1, "La capacidad debe ser mayor a 0"),
  status: z.enum(["disponible", "en_ruta", "mantenimiento"]).default("disponible"),
});

// Add to type exports
export type Truck = typeof trucks.$inferSelect;
export type InsertTruck = z.infer<typeof insertTruckSchema>;

// Routes
export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  driverId: integer("driver_id").notNull().references(() => users.id),
  assistantId: integer("assistant_id").references(() => users.id),
  truckId: integer("truck_id").notNull(),
  zoneId: integer("zone_id").references(() => zones.id),
  status: text("status", { enum: ["pending", "in_progress", "completed"] }).notNull(),
  date: timestamp("date").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  estimatedDuration: integer("estimated_duration"),
  actualDuration: integer("actual_duration"),
  totalDistance: decimal("total_distance", { precision: 10, scale: 2 }),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }),
  deliverySequence: text("delivery_sequence").array(),
  currentLocation: text("current_location"),
  lastUpdate: timestamp("last_update"),
  driverStartedAt: timestamp("driver_started_at"),
  isCompleted: boolean("is_completed").notNull().default(false),
  stops: text("stops").array(),
});

export const insertRouteSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  driverId: z.number({ required_error: "Se requiere un conductor" }),
  date: z.date(),
  truckId: z.number().default(1),
  zoneId: z.number({ required_error: "Se requiere una zona" }),
  status: z.enum(["pending", "in_progress", "completed"]).default("pending"),
  isCompleted: z.boolean().default(false),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  estimatedDuration: z.number().optional(),
  actualDuration: z.number().optional(),
  totalDistance: z.string().regex(/^\d+\.\d{2}$/).optional(),
  totalRevenue: z.string().regex(/^\d+\.\d{2}$/).optional(),
  deliverySequence: z.array(z.string()).optional(),
  currentLocation: z.string().regex(/^-?\d+\.\d+,-?\d+\.\d+$/).optional(),
  lastUpdate: z.string().datetime().optional(),
  driverStartedAt: z.string().datetime().optional(),
  stops: z.array(z.string()).optional(),
});

// Orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  routeId: integer("route_id"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status", { enum: ["pending", "in_transit", "delivered", "cancelled"] }).notNull(),
  paymentMethod: text("payment_method", { enum: ["cash", "credit", "card"] }).notNull(),
  date: timestamp("date").notNull(),
  estimatedDeliveryTime: timestamp("estimated_delivery_time"),
  actualDeliveryTime: timestamp("actual_delivery_time"),
  deliverySequence: integer("delivery_sequence"),
  deliveryCoordinates: text("delivery_coordinates"),
  notes: text("notes"),
  cashCollected: decimal("cash_collected", { precision: 10, scale: 2 }).default("0.00"),
  driverCommission: decimal("driver_commission", { precision: 10, scale: 2 }).default("0.00"),
  assistantCommission: decimal("assistant_commission", { precision: 10, scale: 2 }).default("0.00"),
  recurringOrderId: integer("recurring_order_id").references(() => recurringOrders.id),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
});

export const insertOrderSchema = z.object({
  customerId: z.number(),
  total: z.string().regex(/^\d+\.\d{2}$/, "El total debe tener 2 decimales"),
  status: z.enum(["pending", "in_transit", "delivered", "cancelled"]),
  paymentMethod: z.enum(["cash", "credit", "card"]),
  date: z.string().datetime("La fecha debe estar en formato ISO"),
  routeId: z.number().nullable(),
  estimatedDeliveryTime: z.string().datetime().optional(),
  actualDeliveryTime: z.string().datetime().optional(),
  deliverySequence: z.number().optional(),
  deliveryCoordinates: z.string().regex(/^-?\d+\.\d+,-?\d+\.\d+$/).optional(),
  notes: z.string().optional(),
  cashCollected: z.string().regex(/^\d+\.\d{2}$/).default("0.00"),
  driverCommission: z.string().regex(/^\d+\.\d{2}$/).default("0.00"),
  assistantCommission: z.string().regex(/^\d+\.\d{2}$/).default("0.00"),
}).strict();

export const insertOrderItemSchema = z.object({
  orderId: z.number(),
  productId: z.number(),
  quantity: z.number(),
  price: z.string().regex(/^\d+\.\d{2}$/, "El precio debe tener 2 decimales"),
});

// Bottle Returns
export const bottleReturns = pgTable("bottle_returns", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  expectedQuantity: integer("expected_quantity").notNull(),
  returnedQuantity: integer("returned_quantity").notNull().default(0),
  pendingQuantity: integer("pending_quantity").notNull().default(0),
  returnDate: timestamp("return_date").notNull(),
  status: text("status", { enum: ["pending", "complete", "incomplete"] }).notNull(),
  amountCharged: decimal("amount_charged", { precision: 10, scale: 2 }).default("0.00"),
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }).default("0.00"),
  responsibleType: text("responsible_type", { enum: ["customer", "driver", "both"] }),
  customerPercentage: integer("customer_percentage"),
  driverPercentage: integer("driver_percentage"),
  chargeMethod: text("charge_method", { enum: ["commission", "cash"] }),
  justification: text("justification"),
  lastCheckedAt: timestamp("last_checked_at"),
  automaticAlert: boolean("automatic_alert").default(false),
  manuallyAssigned: boolean("manually_assigned").default(false),
  assignedBy: integer("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at"),
});

export const insertBottleReturnSchema = z.object({
  orderId: z.number(),
  productId: z.number(),
  expectedQuantity: z.number(),
  returnedQuantity: z.number(),
  pendingQuantity: z.number(),
  returnDate: z.string().datetime(),
  status: z.enum(["pending", "complete", "incomplete"]),
  amountCharged: z.string().regex(/^\d+\.\d{2}$/).default("0.00"),
  depositAmount: z.string().regex(/^\d+\.\d{2}$/).default("0.00"),
  responsibleType: z.enum(["customer", "driver", "both"]).optional(),
  customerPercentage: z.number().min(0).max(100).optional(),
  driverPercentage: z.number().min(0).max(100).optional(),
  chargeMethod: z.enum(["commission", "cash"]).optional(),
  justification: z.string().optional(),
  automaticAlert: z.boolean().default(false),
  manuallyAssigned: z.boolean().default(false),
});

// Driver Cash Balances
export const driverCashBalances = pgTable("driver_cash_balances", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => users.id),
  date: timestamp("date").notNull().defaultNow(),
  initialBalance: decimal("initial_balance", { precision: 10, scale: 2 }).default("0.00"),
  cashIn: decimal("cash_in", { precision: 10, scale: 2 }).default("0.00"),
  cashOut: decimal("cash_out", { precision: 10, scale: 2 }).default("0.00"),
  finalBalance: decimal("final_balance", { precision: 10, scale: 2 }).default("0.00"),
  notes: text("notes"),
});

export const insertDriverCashBalanceSchema = z.object({
  driverId: z.number(),
  date: z.string().datetime(),
  initialBalance: z.string().regex(/^\d+\.\d{2}$/).default("0.00"),
  cashIn: z.string().regex(/^\d+\.\d{2}$/).default("0.00"),
  cashOut: z.string().regex(/^\d+\.\d{2}$/).default("0.00"),
  finalBalance: z.string().regex(/^\d+\.\d{2}$/).default("0.00"),
  notes: z.string().optional(),
});

// Returned Bottles
export const returnedBottles = pgTable("returned_bottles", {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").references(() => orders.id),
    productId: integer("product_id").references(() => products.id),
    quantity: integer("quantity").notNull(),
    returnDate: timestamp("return_date").notNull(),
    notes: text("notes"),
});

export const insertReturnedBottleSchema = z.object({
    orderId: z.number().optional(),
    productId: z.number().optional(),
    quantity: z.number(),
    returnDate: z.string().datetime(),
    notes: z.string().optional(),
});

// Zones
export const zones = pgTable("zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  coordinates: text("coordinates").array().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertZoneSchema = z.object({
  name: z.string().min(1, "El nombre de la zona es requerido"),
  color: z.string().min(1, "El color es requerido"),
  coordinates: z.array(z.string().regex(/^-?\d+\.\d+,-?\d+\.\d+$/)),
});

// Recurring Orders
export const recurringOrders = pgTable("recurring_orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  frequency: text("frequency", { enum: ["daily", "weekly", "monthly"] }).notNull(),
  nextOrderDate: timestamp("next_order_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertRecurringOrderSchema = z.object({
  customerId: z.number(),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  nextOrderDate: z.string().datetime(),
  isActive: z.boolean().default(true),
});

// Warehouses
export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  code: serial("code").unique(),
  name: text("name").notNull(),
  address: text("address"),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWarehouseSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  address: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

// Invoices (Facturas)
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: serial("invoice_number").unique(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status", { enum: ["pending", "paid", "cancelled"] }).notNull(),
  paymentMethod: text("payment_method", { enum: ["cash", "credit", "card"] }).notNull(),
  date: timestamp("date").notNull().defaultNow(),
  notes: text("notes"),
});

// Invoice Items (Items de Factura)
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
});

export const insertInvoiceSchema = z.object({
  customerId: z.number(),
  total: z.string().regex(/^\d+\.\d{2}$/, "El total debe tener 2 decimales"),
  status: z.enum(["pending", "paid", "cancelled"]),
  paymentMethod: z.enum(["cash", "credit", "card"]),
  notes: z.string().max(200).optional(),
  date: z.date(),
});

export const insertInvoiceItemSchema = z.object({
  invoiceId: z.number(),
  productId: z.number(),
  quantity: z.number(),
  price: z.string().regex(/^\d+\.\d{2}$/, "El precio debe tener 2 decimales"),
});

// Bills (Facturas)
export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  billNumber: serial("bill_number").unique(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status", { enum: ["pending", "paid", "cancelled"] }).notNull(),
  paymentMethod: text("payment_method", { enum: ["cash", "credit", "card"] }).notNull(),
  date: timestamp("date").notNull().defaultNow(),
  notes: text("notes").notNull(),
});

// Bill Items (Items de Factura)
export const billItems = pgTable("bill_items", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bills.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
});

export const insertBillSchema = z.object({
  customerId: z.number(),
  total: z.string().regex(/^\d+\.\d{2}$/, "El total debe tener 2 decimales"),
  status: z.enum(["pending", "paid", "cancelled"]),
  paymentMethod: z.enum(["cash", "credit", "card"]),
  notes: z.string().max(200),
  date: z.date(),
});

export const insertBillItemSchema = z.object({
  billId: z.number(),
  productId: z.number(),
  quantity: z.number(),
  price: z.string().regex(/^\d+\.\d{2}$/, "El precio debe tener 2 decimales"),
});

// Payments
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method", { enum: ["cash", "credit", "card"] }).notNull(),
  date: timestamp("date").notNull().defaultNow(),
  reference: text("reference"), // Para pagos con tarjeta/crédito
  notes: text("notes"),
});

export const insertPaymentSchema = z.object({
  invoiceId: z.number(),
  customerId: z.number(),
  amount: z.string().regex(/^\d+\.\d{2}$/, "El monto debe tener 2 decimales"),
  paymentMethod: z.enum(["cash", "credit", "card"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

// Customer Orders
export const customerOrders = pgTable("customer_orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  orderType: text("order_type", { enum: ["regular", "wholesale", "special"] }).notNull(),
  frequency: text("frequency", { enum: ["daily", "weekly", "monthly", "occasional"] }).notNull(),
  lastOrderDate: timestamp("last_order_date"),
  totalOrders: integer("total_orders").notNull().default(0),
  averageOrderValue: decimal("average_order_value", { precision: 10, scale: 2 }).notNull().default("0"),
  preferredPaymentMethod: text("preferred_payment_method", { enum: ["cash", "check", "credit_card"] }),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  notes: text("notes"),
});

export const insertCustomerOrdersSchema = z.object({
  customerId: z.number(),
  orderType: z.enum(["regular", "wholesale", "special"]),
  frequency: z.enum(["daily", "weekly", "monthly", "occasional"]),
  lastOrderDate: z.string().datetime().optional(),
  totalOrders: z.number().default(0),
  averageOrderValue: z.string().regex(/^\d+\.\d{2}$/).default("0.00"),
  preferredPaymentMethod: z.enum(["cash", "check", "credit_card"]).optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  notes: z.string().optional(),
});

// Company Settings
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  logo: text("logo"),
  name: text("name").notNull(),
  rnc: text("rnc"),
  street: text("street").notNull(),
  streetNumber: text("street_number").notNull(),
  provinceId: integer("province_id").notNull().references(() => provinces.id),
  municipalityId: integer("municipality_id").notNull().references(() => municipalities.id),
  contactPhone: text("contact_phone").notNull(),
  email: text("email"),
  country: text("country").notNull(),
  currency: text("currency").notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull().default("0.00"),
});

// Add relations
export const settingsRelations = relations(settings, ({ one }) => ({
  province: one(provinces, {
    fields: [settings.provinceId],
    references: [provinces.id],
  }),
  municipality: one(municipalities, {
    fields: [settings.municipalityId],
    references: [municipalities.id],
  }),
}));

export const insertSettingsSchema = z.object({
  logo: z.any().optional(), // Permitir File o string
  name: z.string().min(1, "El nombre es requerido"),
  rnc: z.string().nullable(),
  street: z.string().min(1, "La calle es requerida"),
  streetNumber: z.string().min(1, "El número es requerido"),
  provinceId: z.number({ required_error: "La provincia es requerida" }),
  municipalityId: z.number({ required_error: "El municipio es requerido" }),
  contactPhone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos"),
  email: z.string().email("Correo electrónico inválido").nullable(),
  country: z.string().min(1, "El país es requerido"),
  currency: z.string().min(1, "La moneda es requerida"),
  tax: z.string().regex(/^\d+\.\d{2}$/, "El impuesto debe tener 2 decimales").default("0.00"),
});

// Production Batches
export const productionBatches = pgTable("production_batches", {
  id: serial("id").primaryKey(),
  batchNumber: text("batch_number").notNull().unique(),
  warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id),
  date: timestamp("date").notNull().defaultNow(),
  notes: text("notes"),
  status: text("status", { enum: ["pending", "completed"] }).notNull().default("completed"),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
});

export const productionBatchItems = pgTable("production_batch_items", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => productionBatches.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
});

export const insertProductionBatchSchema = z.object({
  warehouseId: z.number(),
  notes: z.string().optional(),
  status: z.enum(["pending", "completed"]).default("completed"),
  items: z.array(z.object({
    productId: z.number(),
    quantity: z.number(),
    cost: z.string().regex(/^\d+\.\d{2}$/, "El costo debe tener 2 decimales"),
  })),
});

export const insertProductionBatchItemSchema = z.object({
  productId: z.number(),
  quantity: z.number(),
  cost: z.string().regex(/^\d+\.\d{2}$/, "El costo debe tener 2 decimales"),
});

// Add to type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Route = typeof routes.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type Zone = typeof zones.$inferSelect;
export type InsertZone = z.infer<typeof insertZoneSchema>;
export type BottleReturn = typeof bottleReturns.$inferSelect;
export type InsertBottleReturn = z.infer<typeof insertBottleReturnSchema>;
export type DriverCashBalance = typeof driverCashBalances.$inferSelect;
export type InsertDriverCashBalance = z.infer<typeof insertDriverCashBalanceSchema>;
export type Province = typeof provinces.$inferSelect;
export type InsertProvince = z.infer<typeof insertProvinceSchema>;
export type Municipality = typeof municipalities.$inferSelect;
export type InsertMunicipality = z.infer<typeof insertMunicipalitySchema>;
export type City = typeof cities.$inferSelect;
export type InsertCity = z.infer<typeof insertCitySchema>;
export type Sector = typeof sectors.$inferSelect;
export type InsertSector = z.infer<typeof insertSectorSchema>;
export type ReturnedBottle = typeof returnedBottles.$inferSelect;
export type InsertReturnedBottle = z.infer<typeof insertReturnedBottleSchema>;
export type RecurringOrder = typeof recurringOrders.$inferSelect;
export type InsertRecurringOrder = z.infer<typeof insertRecurringOrderSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type Bill = typeof bills.$inferSelect;
export type BillItem = typeof billItems.$inferSelect;
export type InsertBill = z.infer<typeof insertBillSchema>;export type InsertBillItem = z.infer<typeof insertBillItemSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type CustomerOrders = typeof customerOrders.$inferSelect;
export type InsertCustomerOrders = z.infer<typeof insertCustomerOrdersSchema>;
export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;

// Customer extended type with location details
export type CustomerWithDetails = {
  id: number;
  logo: string | null;
  rnc: string | null;
  businessname: string;
  managername: string;
  phone: string;
  email: string | null;
  zoneid: number | null;
  street: string;
  streetnumber: string;
  provinceid: number;
  municipalityid: number;
  reference: string | null;
  creditlimit: string;
  municipalityName?: string;
  provinceName?: string;
};

// Driver location type
export type DriverLocation = {
  latitude: number;
  longitude: number;
  timestamp: Date;
};

export type ProductionBatch = typeof productionBatches.$inferSelect;
export type InsertProductionBatch = z.infer<typeof insertProductionBatchSchema>;
export type ProductionBatchItem = typeof productionBatchItems.$inferSelect;
export type InsertProductionBatchItem = z.infer<typeof insertProductionBatchItemSchema>;