import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      // Navigation
      dashboard: "Dashboard",
      customers: "Customers",
      inventory: "Inventory",
      products: "Products",
      inventoryLoad: "Product Loading",
      routes: "Routes",
      drivers: "Drivers",
      assistants: "Assistants",
      trucks: "Trucks",
      orders: "Orders",
      reports: "Reports",
      settings: "Settings",

      // Common
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      create: "Create",
      status: "Status",
      actions: "Actions",
      saving: "Saving...",

      // Forms
      name: "Name",
      price: "Price",
      quantity: "Quantity",
      date: "Date",
      stock: "Stock",
      notes: "Notes",
      warehouse: "Warehouse",
      cost: "Cost",
      user: "User",
      product: "Product",
      selectProduct: "Select a product",
      selectUser: "Select a user",

      // Success messages
      success: "Success",
      batchCreated: "Production batch created successfully",

      // New Production Batch
      newBatch: "New Production Batch",
      batchHistory: "Batch History",
      type: "Type",
      productType: "Product Type",
      selectProductType: "Select product type",

      // Error messages
      error: "Error",
    }
  },
  es: {
    translation: {
      // Navigation
      dashboard: "Panel",
      customers: "Clientes",
      inventory: "Inventario",
      products: "Productos",
      inventoryLoad: "Carga de Productos",
      routes: "Rutas",
      drivers: "Choferes",
      assistants: "Ayudantes",
      trucks: "Camiones",
      orders: "Pedidos",
      reports: "Reportes",
      settings: "Configuración",

      // Common
      save: "Guardar",
      cancel: "Cancelar",
      delete: "Eliminar",
      edit: "Editar",
      create: "Crear",
      status: "Estado",
      actions: "Acciones",
      saving: "Guardando...",

      // Forms
      name: "Nombre",
      price: "Precio",
      quantity: "Cantidad",
      date: "Fecha",
      stock: "Existencias",
      notes: "Notas",
      warehouse: "Almacén",
      cost: "Costo",
      user: "Usuario",
      product: "Producto",
      selectProduct: "Seleccionar producto",
      selectUser: "Seleccionar usuario",

      // Success messages
      success: "Éxito",
      batchCreated: "Lote de producción creado exitosamente",

      // New Production Batch
      newBatch: "Nuevo Lote de Producción",
      batchHistory: "Historial de Lotes",
      type: "Tipo",
      productType: "Tipo de Producto",
      selectProductType: "Seleccionar tipo de producto",

      // Error messages
      error: "Error",
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