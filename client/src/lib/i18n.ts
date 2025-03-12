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
      orders: "Orders",
      reports: "Reports",
      warehouses: "Warehouses",
      warehouseManagement: "Warehouse Management",

      // Common
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      create: "Create",
      status: "Status",
      actions: "Actions",
      saving: "Saving...",
      points: "points",
      zones: "Zones",
      createZone: "Create Zone",
      noZones: "No zones created yet",
      zoneName: "Zone Name",
      code: "Code",
      description: "Description",
      active: "Active",
      inactive: "Inactive",

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
      warehouseCreated: "Warehouse created successfully",
      warehouseUpdated: "Warehouse updated successfully",

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
      orders: "Pedidos",
      reports: "Reportes",
      warehouses: "Almacenes",
      warehouseManagement: "Gestión de Almacenes",

      // Common
      save: "Guardar",
      cancel: "Cancelar",
      delete: "Eliminar",
      edit: "Editar",
      create: "Crear",
      status: "Estado",
      actions: "Acciones",
      saving: "Guardando...",
      points: "puntos",
      zones: "Zonas",
      createZone: "Crear Zona",
      noZones: "No hay zonas creadas",
      zoneName: "Nombre de la Zona",
      code: "Código",
      description: "Descripción",
      active: "Activo",
      inactive: "Inactivo",

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
      warehouseCreated: "Almacén creado exitosamente",
      warehouseUpdated: "Almacén actualizado exitosamente",

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