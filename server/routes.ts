import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes
  // Get company info
  app.get("/api/company-info", async (req, res) => {
    const companyInfo = await storage.getCompanyInfo();
    if (!companyInfo) {
      return res.status(404).json({ message: "Company information not found" });
    }
    
    return res.json(companyInfo);
  });
  
  // Get client
  app.get("/api/clients/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }
    
    const client = await storage.getClient(id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    
    return res.json(client);
  });
  
  // Get all clients
  app.get("/api/clients", async (req, res) => {
    const clients = await storage.getClients();
    return res.json(clients);
  });
  
  // Get payments by client ID
  app.get("/api/clients/:id/payments", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }
    
    const client = await storage.getClient(id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    
    const payments = await storage.getPaymentsByClientId(id);
    return res.json(payments);
  });
  
  // Get all payments
  app.get("/api/payments", async (req, res) => {
    const payments = await storage.getAllPayments();
    return res.json(payments);
  });
  
  // Get payment by ID
  app.get("/api/payments/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid payment ID" });
    }
    
    const payment = await storage.getPayment(id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }
    
    return res.json(payment);
  });
  
  // Get client with payments (for receipt)
  app.get("/api/receipt/:clientId", async (req, res) => {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }
    
    const client = await storage.getClient(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    
    const payments = await storage.getPaymentsByClientId(clientId);
    const companyInfo = await storage.getCompanyInfo();
    
    // Calculate payment summary
    const totalPaid = payments.reduce((sum, payment) => {
      return sum + parseFloat(payment.amount.toString());
    }, 0);
    
    return res.json({
      client,
      payments,
      companyInfo,
      summary: {
        invoiceCount: payments.length,
        totalPaid
      }
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
