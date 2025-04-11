import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Payment Schema
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  receiptId: text("receipt_id").notNull(),
  description: text("description").notNull(),
  reference: text("reference").notNull(),
  amount: numeric("amount").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Receipt Schema
export const receipts = pgTable("receipts", {
  id: text("id").primaryKey(),
  date: timestamp("date").defaultNow().notNull(),
  customer: text("customer").notNull(),
  subtotal: numeric("subtotal").notNull(),
  taxRate: numeric("tax_rate").notNull(),
  tax: numeric("tax").notNull(),
  total: numeric("total").notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentReference: text("payment_reference").notNull(),
  termsAndConditions: text("terms_and_conditions").notNull(),
});

export const insertReceiptSchema = createInsertSchema(receipts);

export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receipts.$inferSelect;
