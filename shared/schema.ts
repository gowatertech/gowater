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

// Client model
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  documentNumber: text("document_number").notNull(),
  address: text("address").notNull(),
});

export const insertClientSchema = createInsertSchema(clients).pick({
  name: true,
  documentNumber: true,
  address: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// Payment model
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  amount: numeric("amount").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull(),
  method: text("method").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).pick({
  clientId: true,
  invoiceNumber: true,
  issueDate: true,
  dueDate: true,
  amount: true,
  currency: true,
  status: true,
  method: true,
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Company Info model (for receipt header)
export const companyInfo = pgTable("company_info", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ruc: text("ruc").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  website: text("website"),
});

export const insertCompanyInfoSchema = createInsertSchema(companyInfo).pick({
  name: true,
  ruc: true,
  address: true,
  phone: true,
  website: true,
});

export type InsertCompanyInfo = z.infer<typeof insertCompanyInfoSchema>;
export type CompanyInfo = typeof companyInfo.$inferSelect;
