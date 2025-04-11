import { 
  users, type User, type InsertUser,
  clients, type Client, type InsertClient,
  payments, type Payment, type InsertPayment,
  companyInfo, type CompanyInfo, type InsertCompanyInfo
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Client methods
  getClient(id: number): Promise<Client | undefined>;
  getClients(): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  
  // Payment methods
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentsByClientId(clientId: number): Promise<Payment[]>;
  getAllPayments(): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  
  // Company info methods
  getCompanyInfo(): Promise<CompanyInfo | undefined>;
  createOrUpdateCompanyInfo(info: InsertCompanyInfo): Promise<CompanyInfo>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private clients: Map<number, Client>;
  private payments: Map<number, Payment>;
  private companyInfos: Map<number, CompanyInfo>;
  
  private currentUserId: number;
  private currentClientId: number;
  private currentPaymentId: number;
  private currentCompanyInfoId: number;

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.payments = new Map();
    this.companyInfos = new Map();
    
    this.currentUserId = 1;
    this.currentClientId = 1;
    this.currentPaymentId = 1;
    this.currentCompanyInfoId = 1;
    
    // Initialize with sample data
    this.initSampleData();
  }

  private initSampleData() {
    // Create sample company info
    this.createOrUpdateCompanyInfo({
      name: "EMPRESA EJEMPLO S.A.",
      ruc: "12345678901",
      address: "Av. Ejemplo 123, Ciudad",
      phone: "(01) 234-5678",
      website: "www.empresaejemplo.com"
    });
    
    // Create sample client
    const client = this.createClient({
      name: "Juan Pérez",
      documentNumber: "45678912",
      address: "Calle Los Pinos 456"
    });
    
    // Create sample payments
    this.createPayment({
      clientId: client.id,
      invoiceNumber: "F001-0001234",
      issueDate: new Date("2023-06-01"),
      dueDate: new Date("2023-07-01"),
      amount: "120.00",
      currency: "PEN",
      status: "PAGADO",
      method: "Efectivo"
    });
    
    this.createPayment({
      clientId: client.id,
      invoiceNumber: "F001-0001235",
      issueDate: new Date("2023-06-05"),
      dueDate: new Date("2023-07-05"),
      amount: "85.50",
      currency: "PEN",
      status: "PARCIAL",
      method: "Tarjeta"
    });
    
    this.createPayment({
      clientId: client.id,
      invoiceNumber: "F001-0001236",
      issueDate: new Date("2023-06-10"),
      dueDate: new Date("2023-07-10"),
      amount: "210.30",
      currency: "PEN",
      status: "PAGADO",
      method: "Transferencia"
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }
  
  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }
  
  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = this.currentClientId++;
    const client: Client = { ...insertClient, id };
    this.clients.set(id, client);
    return client;
  }
  
  // Payment methods
  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }
  
  async getPaymentsByClientId(clientId: number): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(
      (payment) => payment.clientId === clientId,
    );
  }
  
  async getAllPayments(): Promise<Payment[]> {
    return Array.from(this.payments.values());
  }
  
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = this.currentPaymentId++;
    const payment: Payment = { 
      ...insertPayment, 
      id,
      createdAt: new Date() 
    };
    this.payments.set(id, payment);
    return payment;
  }
  
  // Company info methods
  async getCompanyInfo(): Promise<CompanyInfo | undefined> {
    if (this.companyInfos.size > 0) {
      return this.companyInfos.get(1);
    }
    return undefined;
  }
  
  async createOrUpdateCompanyInfo(info: InsertCompanyInfo): Promise<CompanyInfo> {
    // We'll always use ID 1 for company info for simplicity
    const companyInfo: CompanyInfo = { ...info, id: 1 };
    this.companyInfos.set(1, companyInfo);
    return companyInfo;
  }
}

export const storage = new MemStorage();
