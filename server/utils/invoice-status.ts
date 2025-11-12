/**
 * Invoice status utilities
 * Centralized logic for calculating and updating invoice status based on actual payment data
 */

import { db } from '../db';
import { invoices, payments } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Recalculate and update invoice status based on actual payments in database
 * This ensures the status reflects the TRUE balance, avoiding premature "paid" status
 * 
 * @param invoiceId - ID of the invoice to recalculate
 * @param companyId - Company ID for multi-tenant isolation (optional, for validation)
 * @returns The updated status ("pending" or "paid")
 */
export async function recalculateInvoiceStatus(
  invoiceId: number,
  companyId?: number
): Promise<"pending" | "paid"> {
  // 1. Get the invoice from DB to ensure we have the latest total
  const whereClause = companyId
    ? and(eq(invoices.id, invoiceId), eq(invoices.companyId, companyId))
    : eq(invoices.id, invoiceId);
  
  const [invoice] = await db
    .select({ 
      id: invoices.id,
      total: invoices.total,
      status: invoices.status
    })
    .from(invoices)
    .where(whereClause)
    .limit(1);
  
  if (!invoice) {
    throw new Error(`Invoice #${invoiceId} not found`);
  }
  
  // 2. Calculate the ACTUAL total paid from ALL payments in the database
  const invoicePayments = await db
    .select({ amount: payments.amount })
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId));
  
  const totalPaid = invoicePayments.reduce(
    (sum, payment) => sum + parseFloat(payment.amount.toString()),
    0
  );
  
  const invoiceTotal = parseFloat(invoice.total.toString());
  const remainingBalance = invoiceTotal - totalPaid;
  
  // 3. Determine the correct status based on remaining balance
  // Use 0.01 tolerance to handle floating point rounding
  const newStatus: "pending" | "paid" = remainingBalance <= 0.01 ? "paid" : "pending";
  
  console.log(`[recalculateInvoiceStatus] Invoice #${invoiceId}:`, {
    invoiceTotal: invoiceTotal.toFixed(2),
    totalPaid: totalPaid.toFixed(2),
    remainingBalance: remainingBalance.toFixed(2),
    currentStatus: invoice.status,
    newStatus
  });
  
  // 4. Only update if status has changed to avoid unnecessary writes
  if (invoice.status !== newStatus) {
    await db
      .update(invoices)
      .set({ status: newStatus })
      .where(eq(invoices.id, invoiceId));
    
    console.log(`✅ Invoice #${invoiceId} status updated: ${invoice.status} → ${newStatus}`);
  } else {
    console.log(`ℹ️ Invoice #${invoiceId} status unchanged: ${newStatus}`);
  }
  
  return newStatus;
}

/**
 * Get the current balance of an invoice (total - total paid)
 * 
 * @param invoiceId - ID of the invoice
 * @returns Remaining balance (positive number if unpaid, 0 or negative if overpaid)
 */
export async function getInvoiceBalance(invoiceId: number): Promise<number> {
  // Get invoice total
  const [invoice] = await db
    .select({ total: invoices.total })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  
  if (!invoice) {
    throw new Error(`Invoice #${invoiceId} not found`);
  }
  
  // Get all payments
  const invoicePayments = await db
    .select({ amount: payments.amount })
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId));
  
  const totalPaid = invoicePayments.reduce(
    (sum, payment) => sum + parseFloat(payment.amount.toString()),
    0
  );
  
  const invoiceTotal = parseFloat(invoice.total.toString());
  return invoiceTotal - totalPaid;
}
