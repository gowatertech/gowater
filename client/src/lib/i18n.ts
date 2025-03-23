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
      users: "Users",
      trucks: "Trucks",

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
      createRoute: "Create Route",
      activeRoutes: "Active Routes",
      completedRoutes: "Completed Routes",
      noActiveRoutes: "No active routes",
      noCompletedRoutes: "No completed routes",
      update: "Update",
      confirmDelete: "Are you sure you want to delete this item?",

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
      username: "Username",
      password: "Password",
      role: "Role",
      phone: "Phone",
      license: "License",
      licenseExpiry: "License Expiry",
      emergencyContact: "Emergency Contact",
      selectRole: "Select Role",
      admin: "Administrator",
      supervisor: "Supervisor",
      cashier: "Cashier",
      driver: "Driver",
      assistant: "Assistant",
      addUser: "Add User",
      editUser: "Edit User",

      // Success messages
      success: "Success",
      batchCreated: "Production batch created successfully",
      warehouseCreated: "Warehouse created successfully",
      warehouseUpdated: "Warehouse updated successfully",
      userCreated: "User created successfully",
      userUpdated: "User updated successfully",
      userDeleted: "User deleted successfully",

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
      users: "Usuarios",
      trucks: "Camiones",

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
      createRoute: "Crear Ruta",
      activeRoutes: "Rutas Activas",
      completedRoutes: "Rutas Completadas",
      noActiveRoutes: "No hay rutas activas",
      noCompletedRoutes: "No hay rutas completadas",
      update: "Actualizar",
      confirmDelete: "¿Estás seguro de que deseas eliminar este elemento?",

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
      username: "Nombre de usuario",
      password: "Contraseña",
      role: "Rol",
      phone: "Teléfono",
      license: "Licencia",
      licenseExpiry: "Vencimiento de licencia",
      emergencyContact: "Contacto de emergencia",
      selectRole: "Seleccionar rol",
      admin: "Administrador",
      supervisor: "Supervisor",
      cashier: "Cajero",
      driver: "Chofer",
      assistant: "Ayudante",
      addUser: "Agregar Usuario",
      editUser: "Editar Usuario",

      // Success messages
      success: "Éxito",
      batchCreated: "Lote de producción creado exitosamente",
      warehouseCreated: "Almacén creado exitosamente",
      warehouseUpdated: "Almacén actualizado exitosamente",
      userCreated: "Usuario creado exitosamente",
      userUpdated: "Usuario actualizado exitosamente",
      userDeleted: "Usuario eliminado exitosamente",

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