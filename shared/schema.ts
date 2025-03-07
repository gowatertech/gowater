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

// Schema simplificado para usuarios
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


// Provincias, Ciudades y Sectores
export const provinces = pgTable("provinces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
});

// New municipalities table
export const municipalities = pgTable("municipalities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  provinceId: integer("province_id").notNull().references(() => provinces.id),
  type: text("type", { enum: ["municipality", "district"] }).notNull(),
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

export const cities = pgTable("cities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  municipalityId: integer("municipality_id").notNull().references(() => municipalities.id),
  code: text("code").notNull().unique(), // Código único de la ciudad
});

export const sectors = pgTable("sectors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cityId: integer("city_id").notNull().references(() => cities.id),
  code: text("code").notNull().unique(), // Código único del sector
});

// Customers table
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

// Customer insert schema
export const insertCustomerSchema = z.object({
  logo: z.any().optional(), // Permitir File o string
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

// Products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  icon: text("icon"), // Nuevo campo para el ícono
});

// Production Batches - Para registrar cargas de inventario
export const productionBatches = pgTable("production_batches", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  warehouse: text("warehouse").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  userId: integer("user_id").notNull().references(() => users.id),
  notes: text("notes"),
});

// Trucks
export const trucks = pgTable("trucks", {
  id: serial("id").primaryKey(),
  plate: text("plate").notNull().unique(),
  capacity: integer("capacity").notNull(),
  status: text("status", { enum: ["available", "on_route", "maintenance"] }).notNull(),
});

// Routes
export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  driverId: integer("driver_id").notNull().references(() => users.id),
  assistantId: integer("assistant_id").references(() => users.id),
  truckId: integer("truck_id").notNull(),
  zoneId: integer("zone_id").references(() => zones.id), // Nueva referencia a la zona
  status: text("status", { enum: ["pending", "in_progress", "completed"] }).notNull(),
  date: timestamp("date").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  estimatedDuration: integer("estimated_duration"), // en minutos
  actualDuration: integer("actual_duration"), // en minutos
  totalDistance: decimal("total_distance", { precision: 10, scale: 2 }), // en kilómetros
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }), // total de ingresos
  deliverySequence: text("delivery_sequence").array(), // Array de IDs de pedidos en orden óptimo
  currentLocation: text("current_location"), // Coordenadas actuales "lat,lng"
  lastUpdate: timestamp("last_update"),
  driverStartedAt: timestamp("driver_started_at"), // Cuando el conductor inició la ruta
  isCompleted: boolean("is_completed").notNull().default(false),
  stops: text("stops").array(), // Array de paradas con detalles
});

// Orders - Agregar solo el campo de método de pago
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
});

// Nueva tabla de pagos
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

// Order Items
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
});

// Pedidos por Tipo de Cliente
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

// Zonas
export const zones = pgTable("zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  coordinates: text("coordinates").array().notNull(), // Array de coordenadas que forman el polígono
  createdAt: timestamp("created_at").notNull().defaultNow(),
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

export const insertProductSchema = z.object({
  name: z.string().min(1, "El nombre del producto es requerido"),
  price: z.string().regex(/^\d+\.\d{2}$/, "El precio debe tener 2 decimales"),
  stock: z.number().default(0),
  icon: z.string().optional(),
});

export const insertTruckSchema = z.object({
  plate: z.string().min(1, "La placa es requerida"),
  capacity: z.number({ required_error: "La capacidad es requerida" }),
  status: z.enum(["available", "on_route", "maintenance"]),
});

export const insertRouteSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  driverId: z.number({ required_error: "Se requiere un conductor" }),
  date: z.date(),
  truckId: z.number().default(1),
  zoneId: z.number({ required_error: "Se requiere una zona" }), // Validación para zoneId
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
}).strict();

export const insertOrderItemSchema = z.object({
  orderId: z.number(),
  productId: z.number(),
  quantity: z.number(),
  price: z.string().regex(/^\d+\.\d{2}$/, "El precio debe tener 2 decimales"),
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

export const insertZoneSchema = z.object({
  name: z.string().min(1, "El nombre de la zona es requerido"),
  color: z.string().min(1, "El color es requerido"),
  coordinates: z.array(z.string().regex(/^-?\d+\.\d+,-?\d+\.\d+$/)),
});

// Schema para pagos
export const insertPaymentSchema = z.object({
  invoiceId: z.number(),
  customerId: z.number(),
  amount: z.string().regex(/^\d+\.\d{2}$/, "El monto debe tener 2 decimales"),
  paymentMethod: z.enum(["cash", "credit", "card"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

// Agregar los schemas de inserción
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

// Schemas para las nuevas tablas
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

export const insertProductionBatchSchema = z.object({
  productId: z.number(),
  quantity: z.number(),
  cost: z.string().regex(/^\d+\.\d{2}$/, "El costo debe tener 2 decimales"),
  warehouse: z.string(),
  notes: z.string().optional(),
});

// Schemas de inserción para los nuevos catálogos
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

// Export types
export type User = typeof users.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Truck = typeof trucks.$inferSelect;
export type Route = typeof routes.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type CustomerOrders = typeof customerOrders.$inferSelect;
export type Zone = typeof zones.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Bill = typeof bills.$inferSelect;
export type BillItem = typeof billItems.$inferSelect;


// Nuevos tipos
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;


// Definir el tipo para la ubicación del conductor
export type DriverLocation = {
  latitude: number;
  longitude: number;
  timestamp: Date;
};

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertTruck = z.infer<typeof insertTruckSchema>;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type InsertCustomerOrders = z.infer<typeof insertCustomerOrdersSchema>;
export type InsertZone = z.infer<typeof insertZoneSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type InsertBillItem = z.infer<typeof insertBillItemSchema>;
export type ProductionBatch = typeof productionBatches.$inferSelect;
export type InsertProductionBatch = z.infer<typeof insertProductionBatchSchema>;
export type Province = typeof provinces.$inferSelect;
export type City = typeof cities.$inferSelect;
export type Sector = typeof sectors.$inferSelect;
export type InsertProvince = z.infer<typeof insertProvinceSchema>;
export type InsertCity = z.infer<typeof insertCitySchema>;
export type InsertSector = z.infer<typeof insertSectorSchema>;
export type Municipality = typeof municipalities.$inferSelect;
export type InsertMunicipality = z.infer<typeof insertMunicipalitySchema>;

// Actualizar el tipo Customer para incluir los campos de join
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