import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertPaymentSchema, insertReceiptSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // Get all receipts
  app.get("/api/receipts", async (req, res) => {
    try {
      const receipts = await storage.getAllReceipts();
      res.json(receipts);
    } catch (error) {
      res.status(500).json({ message: "Error fetching receipts" });
    }
  });

  // Get a specific receipt
  app.get("/api/receipts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const receipt = await storage.getReceipt(id);
      
      if (!receipt) {
        return res.status(404).json({ message: "Receipt not found" });
      }
      
      res.json(receipt);
    } catch (error) {
      res.status(500).json({ message: "Error fetching receipt" });
    }
  });

  // Get payments for a receipt
  app.get("/api/receipts/:id/payments", async (req, res) => {
    try {
      const { id } = req.params;
      const payments = await storage.getPaymentsByReceiptId(id);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Error fetching payments" });
    }
  });

  // Create a new receipt
  app.post("/api/receipts", async (req, res) => {
    try {
      const receiptData = insertReceiptSchema.parse(req.body);
      const newReceipt = await storage.createReceipt(receiptData);
      res.status(201).json(newReceipt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid receipt data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating receipt" });
    }
  });

  // Create a new payment
  app.post("/api/payments", async (req, res) => {
    try {
      const paymentData = insertPaymentSchema.parse(req.body);
      const newPayment = await storage.createPayment(paymentData);
      res.status(201).json(newPayment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payment data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating payment" });
    }
  });

  // Get receipt with its payments (combined data)
  app.get("/api/receipts/:id/full", async (req, res) => {
    try {
      const { id } = req.params;
      const receipt = await storage.getReceipt(id);
      
      if (!receipt) {
        return res.status(404).json({ message: "Receipt not found" });
      }
      
      const payments = await storage.getPaymentsByReceiptId(id);
      
      res.json({
        receipt,
        payments
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching receipt data" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
