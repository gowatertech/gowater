import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      // Navigation
      dashboard: "Dashboard",
      customers: "Customers",
      inventory: "Inventory",
      routes: "Routes",
      drivers: "Drivers",
      assistants: "Assistants",
      trucks: "Trucks",
      orders: "Orders",
      reports: "Reports",
      settings: "Settings",

      // Dashboard
      totalSales: "Total Sales",
      pendingPayments: "Pending Payments",
      activeRoutes: "Active Routes",

      // Common
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      create: "Create",
      status: "Status",
      actions: "Actions",

      // Forms
      name: "Name",
      address: "Address",
      phone: "Phone",
      email: "Email",
      password: "Password",
      role: "Role",
      price: "Price",
      quantity: "Quantity",
      date: "Date",
      stock: "Stock",

      // Messages
      success: "Success",
      error: "Error",
      confirmDelete: "Are you sure you want to delete this item?",

      // Customer translations
      businessName: "Business Name",
      newCustomer: "New Customer",
      customerCreated: "Customer created successfully",
      customerUpdated: "Customer updated successfully",
      customerDeleted: "Customer deleted successfully",
      coordinates: "Coordinates",
      balance: "Balance",
      saving: "Saving...",

      // Product translations
      newProduct: "New Product",
      productCreated: "Product created successfully",
      productUpdated: "Product updated successfully",
      productDeleted: "Product deleted successfully",

      // Order translations
      newOrder: "New Order",
      orderCreated: "Order created successfully",
      orderUpdated: "Order updated successfully",
      orderDeleted: "Order deleted successfully",
      orderNumber: "Order #",
      customer: "Customer",
      selectCustomer: "Select a customer",
      paymentMethod: "Payment Method",
      selectPaymentMethod: "Select payment method",
      cash: "Cash",
      check: "Check",
      creditCard: "Credit Card",
      total: "Total",
      pending: "Pending",
      delivered: "Delivered",
      cancelled: "Cancelled"
    }
  },
  es: {
    translation: {
      // Navigation
      dashboard: "Panel",
      customers: "Clientes",
      inventory: "Inventario",
      routes: "Rutas",
      drivers: "Choferes",
      assistants: "Ayudantes",
      trucks: "Camiones",
      orders: "Pedidos",
      reports: "Reportes",
      settings: "Configuración",

      // Dashboard
      totalSales: "Ventas Totales",
      pendingPayments: "Pagos Pendientes",
      activeRoutes: "Rutas Activas",

      // Common
      save: "Guardar",
      cancel: "Cancelar",
      delete: "Eliminar",
      edit: "Editar",
      create: "Crear",
      status: "Estado",
      actions: "Acciones",

      // Forms
      name: "Nombre",
      address: "Dirección",
      phone: "Teléfono",
      email: "Correo Electrónico",
      password: "Contraseña",
      role: "Rol",
      price: "Precio",
      quantity: "Cantidad",
      date: "Fecha",
      stock: "Existencias",

      // Messages
      success: "Éxito",
      error: "Error",
      confirmDelete: "¿Está seguro de que desea eliminar este elemento?",

      // Customer translations
      businessName: "Nombre del Negocio",
      newCustomer: "Nuevo Cliente",
      customerCreated: "Cliente creado exitosamente",
      customerUpdated: "Cliente actualizado exitosamente",
      customerDeleted: "Cliente eliminado exitosamente",
      coordinates: "Coordenadas",
      balance: "Balance",
      saving: "Guardando...",

      // Product translations
      newProduct: "Nuevo Producto",
      productCreated: "Producto creado exitosamente",
      productUpdated: "Producto actualizado exitosamente",
      productDeleted: "Producto eliminado exitosamente",

      // Order translations
      newOrder: "Nuevo Pedido",
      orderCreated: "Pedido creado exitosamente",
      orderUpdated: "Pedido actualizado exitosamente",
      orderDeleted: "Pedido eliminado exitosamente",
      orderNumber: "Pedido #",
      customer: "Cliente",
      selectCustomer: "Seleccionar cliente",
      paymentMethod: "Método de Pago",
      selectPaymentMethod: "Seleccionar método de pago",
      cash: "Efectivo",
      check: "Cheque",
      creditCard: "Tarjeta de Crédito",
      total: "Total",
      pending: "Pendiente",
      delivered: "Entregado",
      cancelled: "Cancelado"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "es", // Default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;