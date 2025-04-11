import { payments, receipts, type Payment, type InsertPayment, type Receipt, type InsertReceipt, type User, type InsertUser, users } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Payment related methods
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByReceiptId(receiptId: string): Promise<Payment[]>;
  
  // Receipt related methods
  createReceipt(receipt: InsertReceipt): Promise<Receipt>;
  getReceipt(receiptId: string): Promise<Receipt | undefined>;
  getAllReceipts(): Promise<Receipt[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private receiptsMap: Map<string, Receipt>;
  private paymentsMap: Map<number, Payment>;
  private userCurrentId: number;
  private paymentCurrentId: number;

  constructor() {
    this.users = new Map();
    this.receiptsMap = new Map();
    this.paymentsMap = new Map();
    this.userCurrentId = 1;
    this.paymentCurrentId = 1;
    
    // Initialize with sample data
    const sampleReceipt: InsertReceipt = {
      id: "INV-20240615-001",
      date: new Date("2024-06-15T14:30:00"),
      customer: "John Doe",
      subtotal: "120.00",
      taxRate: "10.00",
      tax: "12.00",
      total: "132.00",
      paymentMethod: "Credit Card (VISA)",
      paymentReference: "**** 1234",
      termsAndConditions: "This receipt is evidence of payment."
    };
    
    this.createReceipt(sampleReceipt);
    
    const samplePayment: InsertPayment = {
      receiptId: "INV-20240615-001",
      description: "Monthly Service",
      reference: "Ref: SVC-001",
      amount: "120.00",
      status: "PAID"
    };
    
    this.createPayment(samplePayment);
    
    // Add another receipt with multiple payments
    const multiPaymentReceipt: InsertReceipt = {
      id: "INV-20240615-002",
      date: new Date("2024-06-15T15:45:00"),
      customer: "Jane Smith",
      subtotal: "245.00",
      taxRate: "10.00",
      tax: "24.50",
      total: "269.50",
      paymentMethod: "Bank Transfer",
      paymentReference: "TRF-93827465",
      termsAndConditions: "This receipt is evidence of payment."
    };
    
    this.createReceipt(multiPaymentReceipt);
    
    const multiPayments: InsertPayment[] = [
      {
        receiptId: "INV-20240615-002",
        description: "Basic Subscription",
        reference: "Ref: SUB-100",
        amount: "99.00",
        status: "PAID"
      },
      {
        receiptId: "INV-20240615-002",
        description: "Premium Add-on",
        reference: "Ref: ADD-201",
        amount: "45.00",
        status: "PAID"
      },
      {
        receiptId: "INV-20240615-002",
        description: "Support Package",
        reference: "Ref: SPT-110",
        amount: "80.00",
        status: "PAID"
      },
      {
        receiptId: "INV-20240615-002",
        description: "One-time Setup",
        reference: "Ref: OTS-005",
        amount: "21.00",
        status: "PAID"
      }
    ];
    
    multiPayments.forEach(payment => this.createPayment(payment));
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.paymentCurrentId++;
    const newPayment: Payment = { 
      ...payment,
      id,
      createdAt: new Date()
    };
    this.paymentsMap.set(id, newPayment);
    return newPayment;
  }
  
  async getPaymentsByReceiptId(receiptId: string): Promise<Payment[]> {
    return Array.from(this.paymentsMap.values()).filter(
      payment => payment.receiptId === receiptId
    );
  }
  
  async createReceipt(receipt: InsertReceipt): Promise<Receipt> {
    this.receiptsMap.set(receipt.id, receipt as Receipt);
    return receipt as Receipt;
  }
  
  async getReceipt(receiptId: string): Promise<Receipt | undefined> {
    return this.receiptsMap.get(receiptId);
  }
  
  async getAllReceipts(): Promise<Receipt[]> {
    return Array.from(this.receiptsMap.values());
  }
}

export const storage = new MemStorage();
