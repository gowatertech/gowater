export type UserRole = "admin" | "supervisor" | "cashier" | "driver" | "assistant";

export type AppModule =
  | "dashboard"
  | "orders"
  | "billing"
  | "payments"
  | "customers"
  | "routes"
  | "zones"
  | "operations"
  | "inventory"
  | "bottles"
  | "finance"
  | "administration"
  | "settings"
  | "manual"
  | "cash-reconciliation"
  | "mobile-app";

const rolePermissions: Record<UserRole, AppModule[]> = {
  admin: [
    "dashboard", "orders", "billing", "payments", "customers",
    "routes", "zones", "operations", "inventory", "bottles",
    "finance", "administration", "settings", "manual", "cash-reconciliation",
  ],
  supervisor: [
    "dashboard", "orders", "billing", "payments", "customers",
    "routes", "zones", "operations", "inventory", "bottles",
    "finance", "manual", "cash-reconciliation",
  ],
  cashier: [
    "orders", "billing", "payments", "customers", "manual",
  ],
  driver: [
    "mobile-app",
  ],
  assistant: [
    "mobile-app",
  ],
};

const routeToModule: Record<string, AppModule> = {
  "/dashboard": "dashboard",
  "/orders": "orders",
  "/billing": "billing",
  "/payments": "payments",
  "/customers": "customers",
  "/routes": "routes",
  "/zones": "zones",
  "/operations": "operations",
  "/routes/trucks": "operations",
  "/vehicle-loading": "operations",
  "/vehicle-settlement": "operations",
  "/routes/settlements": "operations",
  "/recurring-orders": "orders",
  "/drivers": "operations",
  "/entregas": "operations",
  "/inventory": "inventory",
  "/inventory/products": "inventory",
  "/inventory/warehouses": "inventory",
  "/inventory/production": "inventory",
  "/bottles": "bottles",
  "/bottles/return": "bottles",
  "/bottles/balance": "bottles",
  "/bottles/missing": "bottles",
  "/bottles/pending": "bottles",
  "/bottles/assign-responsibility": "bottles",
  "/commissions": "finance",
  "/reports": "finance",
  "/cash-reconciliation": "cash-reconciliation",
  "/transactions": "payments",
  "/users": "administration",
  "/settings": "settings",
  "/manual": "manual",
  "/mobile-app": "mobile-app",
};

const sidebarLabelToModule: Record<string, AppModule> = {
  "Panel de Control": "dashboard",
  "Pedidos": "orders",
  "Facturación": "billing",
  "Pagos": "payments",
  "Clientes": "customers",
  "Rutas": "routes",
  "Zonas": "zones",
  "Operaciones": "operations",
  "Inventario": "inventory",
  "Envases": "bottles",
  "Finanzas": "finance",
  "Administración": "administration",
  "Configuración": "settings",
  "Manual de Usuario": "manual",
  "Cuadre de Caja": "cash-reconciliation",
};

export function hasModuleAccess(role: UserRole, module: AppModule): boolean {
  const permissions = rolePermissions[role];
  if (!permissions) return false;
  return permissions.includes(module);
}

export function hasRouteAccess(role: UserRole, path: string): boolean {
  if (path.startsWith("/mobile-app")) {
    return hasModuleAccess(role, "mobile-app");
  }

  const exactModule = routeToModule[path];
  if (exactModule) {
    return hasModuleAccess(role, exactModule);
  }

  const matchingPrefix = Object.keys(routeToModule)
    .filter(route => route !== "/" && path.startsWith(route))
    .sort((a, b) => b.length - a.length)[0];

  if (matchingPrefix) {
    return hasModuleAccess(role, routeToModule[matchingPrefix]);
  }

  return role === "admin";
}

export function getModuleForSidebarLabel(label: string): AppModule | undefined {
  return sidebarLabelToModule[label];
}

export function isSidebarItemVisible(role: UserRole, label: string): boolean {
  const module = getModuleForSidebarLabel(label);
  if (!module) return role === "admin";
  return hasModuleAccess(role, module);
}

export function getDefaultRedirect(role: UserRole): string {
  if (role === "driver" || role === "assistant") {
    return "/mobile-app";
  }
  if (role === "cashier") {
    return "/orders";
  }
  return "/dashboard";
}

export function isMobileOnlyRole(role: UserRole): boolean {
  return role === "driver" || role === "assistant";
}

export function isDashboardRole(role: UserRole): boolean {
  return role === "admin" || role === "supervisor" || role === "cashier";
}

export { rolePermissions, routeToModule, sidebarLabelToModule };
