import { PrinterService } from './services/PrinterService';

// Datos de prueba de un pedido
const testOrder = {
  id: 33,
  customerId: 3,
  total: "153.40",
  status: "pending",
  date: "2025-04-07T14:14:56.780Z",
  customerName: "Tio Papita",
  address: "calle mella"
};

// Datos de prueba de ítems de pedido
const testOrderItems = [
  {
    id: 45,
    orderId: 33,
    productId: 1,
    quantity: 1,
    price: "153.40",
  }
];

// Datos de prueba del cliente
const testCustomer = {
  id: 3,
  businessname: "Tio Papita",
  phone: "8093240265",
  address: "calle mella",
  municipality: "Cotuí",
  province: "Sánchez Ramírez"
};

// Productos de prueba
const testProducts = [
  {
    id: 1,
    name: "BOTELLÓN AGUA",
    price: "153.40",
    stock: 110,
    icon: "water5gl",
    isReturnable: true,
    depositAmount: "10.00"
  }
];

// Configuración de la empresa
const testSettings = {
  id: 1,
  name: "AGUA HARRIS",
  rnc: "999999999",
  street: "Calle Duarte no 112",
  streetNumber: "112",
  contactPhone: "8498738333",
  email: "aguaharris@gmail.com"
};

// Función de prueba para imprimir pedido
export async function testPrintOrder() {
  console.log("Prueba de impresión de pedido iniciada");
  try {
    await PrinterService.printOrder(
      testOrder,
      testOrderItems,
      testCustomer,
      testSettings,
      testProducts
    );
    console.log("Impresión de pedido completada con éxito");
    return true;
  } catch (error) {
    console.error("Error en la prueba de impresión de pedido:", error);
    return false;
  }
}

// Función de prueba para generar PDF de pedido
export async function testGenerateOrderPDF() {
  console.log("Prueba de generación de PDF de pedido iniciada");
  try {
    await PrinterService.generateOrderPDF(
      testOrder,
      testOrderItems,
      testCustomer,
      testSettings,
      testProducts
    );
    console.log("Generación de PDF de pedido completada con éxito");
    return true;
  } catch (error) {
    console.error("Error en la prueba de generación de PDF de pedido:", error);
    return false;
  }
}

// Datos de prueba de pago
const testPayment = {
  id: 16,
  invoiceId: 19,
  amount: "94.40",
  date: "2025-03-31T02:05:29.967Z",
  notes: "Pago recibido al momento de la entrega",
  method: "cash",
  customerName: "Grande Yungo",
  invoiceNumber: 30
};

// Función de prueba para imprimir pago
export async function testPrintPayment() {
  console.log("Prueba de impresión de pago iniciada");
  try {
    await PrinterService.printPayment(
      testPayment,
      testCustomer,
      testSettings
    );
    console.log("Impresión de pago completada con éxito");
    return true;
  } catch (error) {
    console.error("Error en la prueba de impresión de pago:", error);
    return false;
  }
}

// Función de prueba para generar PDF de pago
export async function testGeneratePaymentPDF() {
  console.log("Prueba de generación de PDF de pago iniciada");
  try {
    await PrinterService.generatePaymentPDF(
      testPayment,
      testCustomer,
      testSettings
    );
    console.log("Generación de PDF de pago completada con éxito");
    return true;
  } catch (error) {
    console.error("Error en la prueba de generación de PDF de pago:", error);
    return false;
  }
}

// Exportamos una función para ejecutar todas las pruebas
export async function runAllTests() {
  console.log("Iniciando pruebas completas de impresión y generación de PDF");
  
  const orderPrintResult = await testPrintOrder();
  const orderPDFResult = await testGenerateOrderPDF();
  const paymentPrintResult = await testPrintPayment();
  const paymentPDFResult = await testGeneratePaymentPDF();
  
  console.log("Resultados de las pruebas:");
  console.log(`Impresión de pedido: ${orderPrintResult ? '✓' : '✗'}`);
  console.log(`PDF de pedido: ${orderPDFResult ? '✓' : '✗'}`);
  console.log(`Impresión de pago: ${paymentPrintResult ? '✓' : '✗'}`);
  console.log(`PDF de pago: ${paymentPDFResult ? '✓' : '✗'}`);
  
  return {
    orderPrintResult,
    orderPDFResult,
    paymentPrintResult,
    paymentPDFResult
  };
}