import { pgTable, serial, integer, text, boolean, date, timestamp, varchar, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { customers, products, orders } from "./schema";

// Tabla de pedidos recurrentes
export const recurringOrders = pgTable("recurring_orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  name: text("name").notNull(),
  description: text("description"),
  frequency: varchar("frequency", { length: 20 }).notNull().$type<"daily" | "weekly" | "biweekly" | "monthly" | "custom">(),
  frequencyDays: integer("frequency_days"),
  weekdays: text("weekdays"),
  monthDays: text("month_days"),
  status: varchar("status", { length: 20 }).notNull().default("active").$type<"active" | "paused" | "cancelled">(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  nextDeliveryDate: date("next_delivery_date").notNull(),
  zoneId: integer("zone_id"),
  notifyCustomer: boolean("notify_customer").default(false),
  notifyBefore: integer("notify_before"),
  totalGeneratedOrders: integer("total_generated_orders").default(0),
  lastGeneratedDate: timestamp("last_generated_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Tabla de items de pedidos recurrentes
export const recurringOrderItems = pgTable("recurring_order_items", {
  id: serial("id").primaryKey(),
  recurringOrderId: integer("recurring_order_id").notNull().references(() => recurringOrders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  price: text("price"),
  notes: text("notes")
});

// Tabla de excepciones de pedidos recurrentes
export const recurringOrderExceptions = pgTable("recurring_order_exceptions", {
  id: serial("id").primaryKey(),
  recurringOrderId: integer("recurring_order_id").notNull().references(() => recurringOrders.id),
  exceptionDate: date("exception_date").notNull(),
  exceptionType: varchar("exception_type", { length: 20 }).notNull().$type<"skip" | "modify" | "reschedule">(),
  reason: text("reason"),
  newDate: date("new_date"),
  modifiedItems: json("modified_items")
});

// Tabla de historial de pedidos recurrentes
export const recurringOrderHistory = pgTable("recurring_order_history", {
  id: serial("id").primaryKey(),
  recurringOrderId: integer("recurring_order_id").references(() => recurringOrders.id),
  generatedOrderId: integer("generated_order_id").references(() => orders.id),
  scheduledDate: date("scheduled_date").notNull(),
  generatedDate: timestamp("generated_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("created").$type<"created" | "delivered" | "cancelled">(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
});

// Esquemas Zod para validación
export const insertRecurringOrderSchema = createInsertSchema(recurringOrders);
export const insertRecurringOrderItemSchema = createInsertSchema(recurringOrderItems);
export const insertRecurringOrderExceptionSchema = createInsertSchema(recurringOrderExceptions);

// Relaciones
export const recurringOrdersRelations = relations(recurringOrders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [recurringOrders.customerId],
    references: [customers.id]
  }),
  items: many(recurringOrderItems),
  exceptions: many(recurringOrderExceptions),
  history: many(recurringOrderHistory)
}));

export const recurringOrderItemsRelations = relations(recurringOrderItems, ({ one }) => ({
  recurringOrder: one(recurringOrders, {
    fields: [recurringOrderItems.recurringOrderId],
    references: [recurringOrders.id]
  }),
  product: one(products, {
    fields: [recurringOrderItems.productId],
    references: [products.id]
  })
}));

export const recurringOrderExceptionsRelations = relations(recurringOrderExceptions, ({ one }) => ({
  recurringOrder: one(recurringOrders, {
    fields: [recurringOrderExceptions.recurringOrderId],
    references: [recurringOrders.id]
  })
}));

export const recurringOrderHistoryRelations = relations(recurringOrderHistory, ({ one }) => ({
  recurringOrder: one(recurringOrders, {
    fields: [recurringOrderHistory.recurringOrderId],
    references: [recurringOrders.id]
  }),
  order: one(orders, {
    fields: [recurringOrderHistory.generatedOrderId],
    references: [orders.id]
  })
}));

// Tipos exportados
export type RecurringOrder = typeof recurringOrders.$inferSelect;
export type InsertRecurringOrder = z.infer<typeof insertRecurringOrderSchema>;

export type RecurringOrderItem = typeof recurringOrderItems.$inferSelect;
export type InsertRecurringOrderItem = z.infer<typeof insertRecurringOrderItemSchema>;

export type RecurringOrderException = typeof recurringOrderExceptions.$inferSelect;
export type InsertRecurringOrderException = z.infer<typeof insertRecurringOrderExceptionSchema>;

export type RecurringOrderHistory = typeof recurringOrderHistory.$inferSelect;