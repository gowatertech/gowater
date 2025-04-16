# Sistema de Comisiones para Choferes y Ayudantes

## Descripción General

Este documento describe el plan de implementación de un sistema de comisiones para choferes y ayudantes en GoWater. El sistema calcula comisiones basadas en entregas semanales (lunes a domingo) utilizando valores fijos por producto entregado.

## Funcionalidades Principales

- Configuración de valores de comisión para productos
- Cálculo automático de comisiones semanales
- Panel administrativo para gestionar y pagar comisiones
- Informes detallados para choferes y ayudantes

## Modelo de Datos

### 1. Actualización de Productos

Se agregarán los siguientes campos a la tabla `products`:

```typescript
const products = pgTable("products", {
  // Campos existentes...
  isCommissionable: boolean("is_commissionable").default(false),
  driverCommissionValue: decimal("driver_commission_value", { precision: 10, scale: 2 }).default("0"),
  helperCommissionValue: decimal("helper_commission_value", { precision: 10, scale: 2 }).default("0")
});
```

### 2. Tabla de Comisiones

```typescript
const commissions = pgTable("commissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  userRole: text("user_role", { enum: ["driver", "helper"] }),
  routeId: integer("route_id").references(() => routes.id),
  weekStartDate: date("week_start_date"), // Lunes
  weekEndDate: date("week_end_date"),     // Domingo
  productCount: integer("product_count"), // Total de productos entregados
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  status: text("status", { enum: ["pending", "paid", "cancelled"] }).default("pending"),
  paymentDate: timestamp("payment_date").default(sql`NULL`),
  paymentReference: text("payment_reference"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
});
```

### 3. Tabla de Detalles de Comisión

```typescript
const commissionItems = pgTable("commission_items", {
  id: serial("id").primaryKey(),
  commissionId: integer("commission_id").references(() => commissions.id),
  orderId: integer("order_id").references(() => orders.id),
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity"),
  commissionValue: decimal("commission_value", { precision: 10, scale: 2 }),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }),
  deliveryDate: timestamp("delivery_date")
});
```

## Flujo del Sistema

1. **Configuración**: Los administradores marcan productos como "comisionables" y establecen el valor fijo de comisión por unidad para choferes y ayudantes.

2. **Entrega**: Los choferes y ayudantes realizan entregas, que se registran en el sistema.

3. **Cálculo**: El sistema calcula automáticamente las comisiones semanales cada lunes o bajo demanda:
   - Se identifican las rutas completadas en la semana anterior
   - Para cada ruta, se calculan comisiones para chofer y ayudante
   - Solo se consideran productos marcados como "comisionables"
   - El cálculo es: Cantidad de producto × Valor fijo de comisión

4. **Gestión**: Los administradores ven el panel de comisiones donde pueden:
   - Revisar las comisiones pendientes y pagadas
   - Ver detalles de productos entregados por cada persona
   - Registrar pagos de comisiones

5. **Consulta**: Choferes y ayudantes pueden ver sus comisiones ganadas y el estado de pago.

## Implementación del Backend

### 1. Servicio de Cálculo de Comisiones

```typescript
class CommissionService {
  /**
   * Calcula las comisiones semanales para choferes y ayudantes
   * basadas en valores fijos por unidad de producto comisionable
   * Para la semana que finaliza en la fecha especificada.
   */
  async calculateWeeklyCommissions(endDate: Date = new Date()): Promise<void> {
    // Determinar el rango de fechas (lunes a domingo)
    const weekEndDate = this.getEndOfWeek(endDate); // Domingo
    const weekStartDate = this.getStartOfWeek(endDate); // Lunes
    
    console.log(`Calculando comisiones para la semana: ${weekStartDate.toISOString().split('T')[0]} al ${weekEndDate.toISOString().split('T')[0]}`);
    
    // Obtener todas las rutas con estatus "completed" en ese período
    const completedRoutes = await this.getCompletedRoutesInRange(weekStartDate, weekEndDate);
    
    console.log(`Se encontraron ${completedRoutes.length} rutas completadas en el período`);
    
    // Para cada ruta, calcular las comisiones para el chofer y el ayudante
    for (const route of completedRoutes) {
      const driverId = route.driverId;
      const helperId = route.helperId;
      
      if (!driverId) {
        console.log(`Advertencia: Ruta ID ${route.id} sin chofer asignado`);
        continue;
      }
      
      // Obtener órdenes entregadas en esta ruta
      const deliveredOrders = await this.getDeliveredOrdersForRoute(route.id);
      
      if (deliveredOrders.length === 0) {
        console.log(`No hay órdenes entregadas para la ruta ID ${route.id}`);
        continue;
      }
      
      // Calcular comisiones para el chofer
      await this.calculateUserCommission(
        driverId, 
        "driver", 
        route.id, 
        deliveredOrders, 
        weekStartDate, 
        weekEndDate
      );
      
      // Si hay ayudante, calcular sus comisiones
      if (helperId) {
        await this.calculateUserCommission(
          helperId, 
          "helper", 
          route.id, 
          deliveredOrders, 
          weekStartDate, 
          weekEndDate
        );
      }
    }
  }
  
  /**
   * Calcula la comisión para un usuario (chofer o ayudante) en base a 
   * las órdenes entregadas en una ruta específica.
   */
  private async calculateUserCommission(
    userId: number, 
    userRole: "driver" | "helper",
    routeId: number, 
    orders: Order[], 
    weekStartDate: Date, 
    weekEndDate: Date
  ): Promise<void> {
    let totalCommission = 0;
    let totalProductCount = 0;
    const commissionItems = [];
    
    // Procesar cada orden
    for (const order of orders) {
      // Obtener items de cada orden
      const orderItems = await this.getOrderItems(order.id);
      
      // Procesar cada ítem del pedido
      for (const item of orderItems) {
        const product = await this.getProduct(item.productId);
        
        if (product.isCommissionable) {
          // Usar el valor fijo apropiado según el rol
          const commissionValue = userRole === "driver" 
            ? product.driverCommissionValue 
            : product.helperCommissionValue;
          
          // La comisión es simplemente el valor fijo por la cantidad
          const commissionAmount = parseFloat(commissionValue) * item.quantity;
          
          if (commissionAmount > 0) {
            totalCommission += commissionAmount;
            totalProductCount += item.quantity;
            
            commissionItems.push({
              orderId: order.id,
              productId: item.productId,
              quantity: item.quantity,
              commissionValue,
              commissionAmount,
              deliveryDate: order.deliveryDate
            });
          }
        }
      }
    }
    
    // Solo crear registro si hay comisiones a pagar
    if (commissionItems.length > 0) {
      console.log(`Creando comisión para ${userRole} (ID: ${userId}): RD$ ${totalCommission.toFixed(2)} por ${totalProductCount} productos`);
      
      // Crear el registro principal de comisión
      const commissionId = await this.createCommissionRecord(
        userId,
        userRole,
        routeId,
        weekStartDate,
        weekEndDate,
        totalProductCount,
        totalCommission
      );
      
      // Guardar los detalles de cada ítem
      await this.saveCommissionItems(commissionId, commissionItems);
    } else {
      console.log(`No hay productos comisionables para ${userRole} (ID: ${userId}) en la ruta ${routeId}`);
    }
  }
  
  /**
   * Crea un registro de comisión en la base de datos.
   */
  private async createCommissionRecord(
    userId: number,
    userRole: "driver" | "helper",
    routeId: number,
    weekStartDate: Date,
    weekEndDate: Date,
    productCount: number,
    totalAmount: number
  ): Promise<number> {
    // Verificar si ya existe una comisión para este usuario, ruta y semana
    const existingCommission = await db.query.commissions.findFirst({
      where: and(
        eq(commissions.userId, userId),
        eq(commissions.routeId, routeId),
        eq(commissions.weekStartDate, weekStartDate),
        eq(commissions.weekEndDate, weekEndDate)
      )
    });
    
    if (existingCommission) {
      console.log(`Ya existe una comisión para usuario ${userId}, ruta ${routeId}, semana ${weekStartDate.toISOString().split('T')[0]}`);
      return existingCommission.id;
    }
    
    // Crear nuevo registro de comisión
    const [result] = await db.insert(commissions).values({
      userId,
      userRole,
      routeId,
      weekStartDate,
      weekEndDate,
      productCount,
      totalAmount,
      status: "pending",
      createdAt: new Date()
    }).returning({ id: commissions.id });
    
    return result.id;
  }
  
  /**
   * Guarda los ítems detallados de comisión.
   */
  private async saveCommissionItems(
    commissionId: number, 
    items: any[]
  ): Promise<void> {
    for (const item of items) {
      await db.insert(commissionItems).values({
        commissionId,
        orderId: item.orderId,
        productId: item.productId,
        quantity: item.quantity,
        commissionValue: item.commissionValue,
        commissionAmount: item.commissionAmount,
        deliveryDate: item.deliveryDate
      });
    }
  }
  
  /**
   * Obtiene el inicio de la semana (Lunes) para una fecha dada.
   */
  private getStartOfWeek(date: Date): Date {
    const result = new Date(date);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Lunes
    result.setDate(diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }
  
  /**
   * Obtiene el fin de la semana (Domingo) para una fecha dada.
   */
  private getEndOfWeek(date: Date): Date {
    const result = new Date(date);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? 0 : 7); // Domingo
    result.setDate(diff);
    result.setHours(23, 59, 59, 999);
    return result;
  }
}
```

### 2. API Endpoints

```typescript
// En server/routes.ts

// Endpoints para comisiones
export const createCommissionsEndpoints = (router: Router) => {
  // Calcular comisiones para la semana actual
  router.post("/commissions/calculate", async (req, res) => {
    try {
      const commissionService = new CommissionService();
      await commissionService.calculateWeeklyCommissions();
      res.status(200).json({ message: "Cálculo de comisiones completado" });
    } catch (error) {
      console.error("Error al calcular comisiones:", error);
      res.status(500).json({ error: "Error al calcular comisiones" });
    }
  });

  // Listar comisiones con filtros
  router.get("/commissions", async (req, res) => {
    try {
      const { startDate, endDate, role, status } = req.query;
      
      // Construir consulta con filtros opcionales
      let query = db.select({
        id: commissions.id,
        userId: commissions.userId,
        userName: users.name,
        userRole: commissions.userRole,
        routeId: commissions.routeId,
        weekStartDate: commissions.weekStartDate,
        weekEndDate: commissions.weekEndDate,
        productCount: commissions.productCount,
        totalAmount: commissions.totalAmount,
        status: commissions.status,
        paymentDate: commissions.paymentDate,
        createdAt: commissions.createdAt
      })
      .from(commissions)
      .innerJoin(users, eq(commissions.userId, users.id))
      .orderBy(desc(commissions.createdAt));
      
      // Aplicar filtros si existen
      if (startDate) {
        query = query.where(gte(commissions.weekStartDate, new Date(startDate as string)));
      }
      
      if (endDate) {
        query = query.where(lte(commissions.weekEndDate, new Date(endDate as string)));
      }
      
      if (role && role !== "all") {
        query = query.where(eq(commissions.userRole, role as string));
      }
      
      if (status && status !== "all") {
        query = query.where(eq(commissions.status, status as string));
      }
      
      const results = await query;
      res.json(results);
    } catch (error) {
      console.error("Error al obtener comisiones:", error);
      res.status(500).json({ error: "Error al obtener comisiones" });
    }
  });

  // Obtener detalles de una comisión
  router.get("/commissions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Obtener la comisión principal
      const commission = await db.query.commissions.findFirst({
        where: eq(commissions.id, id),
        with: {
          user: true,
          route: true
        }
      });
      
      if (!commission) {
        return res.status(404).json({ error: "Comisión no encontrada" });
      }
      
      // Obtener los items detallados
      const items = await db.select({
        id: commissionItems.id,
        orderId: commissionItems.orderId,
        productId: commissionItems.productId,
        productName: products.name,
        quantity: commissionItems.quantity,
        commissionValue: commissionItems.commissionValue,
        commissionAmount: commissionItems.commissionAmount,
        deliveryDate: commissionItems.deliveryDate
      })
      .from(commissionItems)
      .innerJoin(products, eq(commissionItems.productId, products.id))
      .where(eq(commissionItems.commissionId, id))
      .orderBy(commissionItems.deliveryDate);
      
      res.json({
        commission,
        items
      });
    } catch (error) {
      console.error("Error al obtener detalles de comisión:", error);
      res.status(500).json({ error: "Error al obtener detalles de comisión" });
    }
  });

  // Marcar comisión como pagada
  router.patch("/commissions/:id/pay", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { paymentDate, paymentReference, notes } = req.body;
      
      const result = await db.update(commissions)
        .set({
          status: "paid",
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentReference,
          notes
        })
        .where(eq(commissions.id, id))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Comisión no encontrada" });
      }
      
      res.json(result[0]);
    } catch (error) {
      console.error("Error al marcar comisión como pagada:", error);
      res.status(500).json({ error: "Error al marcar comisión como pagada" });
    }
  });
  
  // Obtener comisiones para un usuario específico
  router.get("/users/:userId/commissions", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { startDate, endDate, status } = req.query;
      
      let query = db.select()
        .from(commissions)
        .where(eq(commissions.userId, userId))
        .orderBy(desc(commissions.createdAt));
      
      if (startDate) {
        query = query.where(gte(commissions.weekStartDate, new Date(startDate as string)));
      }
      
      if (endDate) {
        query = query.where(lte(commissions.weekEndDate, new Date(endDate as string)));
      }
      
      if (status && status !== "all") {
        query = query.where(eq(commissions.status, status as string));
      }
      
      const results = await query;
      res.json(results);
    } catch (error) {
      console.error("Error al obtener comisiones del usuario:", error);
      res.status(500).json({ error: "Error al obtener comisiones del usuario" });
    }
  });
};
```

## Interfaz de Usuario

### 1. Configuración en Productos

Formulario para establecer comisiones por producto:

```tsx
<FormGroup>
  <FormField
    control={form.control}
    name="isCommissionable"
    render={({ field }) => (
      <FormItem>
        <div className="flex items-center">
          <FormLabel className="mr-2">Producto Comisionable</FormLabel>
          <FormControl>
            <Switch 
              checked={field.value} 
              onCheckedChange={field.onChange}
            />
          </FormControl>
        </div>
        <FormMessage />
      </FormItem>
    )}
  />

  {form.watch("isCommissionable") && (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {/* Comisión para Chofer */}
      <div className="space-y-2 border p-3 rounded-md">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <User className="h-4 w-4" />
          Comisión para Chofer (RD$ por unidad)
        </h4>
        <FormField
          control={form.control}
          name="driverCommissionValue"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center">
                <span className="text-sm mr-2">RD$</span>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                  />
                </FormControl>
              </div>
              <FormDescription>
                Valor fijo por cada unidad entregada
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Comisión para Ayudante */}
      <div className="space-y-2 border p-3 rounded-md">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <Users className="h-4 w-4" />
          Comisión para Ayudante (RD$ por unidad)
        </h4>
        <FormField
          control={form.control}
          name="helperCommissionValue"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center">
                <span className="text-sm mr-2">RD$</span>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                  />
                </FormControl>
              </div>
              <FormDescription>
                Valor fijo por cada unidad entregada
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )}
</FormGroup>
```

### 2. Panel de Administración de Comisiones

Vista para administradores:

```tsx
function CommissionsAdmin() {
  const [dateRange, setDateRange] = useState([getStartOfWeek(new Date()), getEndOfWeek(new Date())]);
  const [roleFilter, setRoleFilter] = useState<"all" | "driver" | "helper">("all");
  
  // Formatear fechas para mostrar
  const formattedStartDate = format(dateRange[0], "dd/MM/yyyy");
  const formattedEndDate = format(dateRange[1], "dd/MM/yyyy");
  
  // Obtener datos con React Query
  const { data: commissions, isLoading, refetch } = useQuery({
    queryKey: ["commissions", dateRange, roleFilter],
    queryFn: async () => {
      const response = await apiRequest(
        "GET", 
        `/api/commissions?startDate=${dateRange[0].toISOString()}&endDate=${dateRange[1].toISOString()}&role=${roleFilter}`
      );
      return response.json();
    }
  });
  
  // Calcular comisiones de la semana actual
  const calculateCommissionsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/commissions/calculate");
    },
    onSuccess: () => {
      toast.success("Comisiones calculadas correctamente");
      refetch();
    },
    onError: (error) => {
      toast.error("Error al calcular comisiones");
      console.error(error);
    }
  });
  
  // Agrupar comisiones por usuario para mostrar resumen
  const groupedCommissions = useMemo(() => {
    if (!commissions) return [];
    
    const grouped = commissions.reduce((acc, commission) => {
      const key = `${commission.userId}-${commission.userRole}`;
      if (!acc[key]) {
        acc[key] = {
          userId: commission.userId,
          userName: commission.userName,
          userRole: commission.userRole,
          totalAmount: 0,
          productCount: 0,
          commissionCount: 0,
          pendingAmount: 0,
          paidAmount: 0
        };
      }
      
      acc[key].commissionCount++;
      acc[key].productCount += commission.productCount;
      acc[key].totalAmount += parseFloat(commission.totalAmount);
      
      if (commission.status === "pending") {
        acc[key].pendingAmount += parseFloat(commission.totalAmount);
      } else if (commission.status === "paid") {
        acc[key].paidAmount += parseFloat(commission.totalAmount);
      }
      
      return acc;
    }, {});
    
    return Object.values(grouped).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [commissions]);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Comisiones</h1>
          <p className="text-muted-foreground">
            Administre y pague las comisiones a choferes y ayudantes
          </p>
        </div>
        
        <Button 
          onClick={() => calculateCommissionsMutation.mutate()}
          disabled={calculateCommissionsMutation.isPending}
        >
          {calculateCommissionsMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Calculando...
            </>
          ) : (
            <>
              <CalculatorIcon className="mr-2 h-4 w-4" />
              Calcular Comisiones
            </>
          )}
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <CardTitle>Período Semanal</CardTitle>
              <CardDescription>
                Comisiones del {formattedStartDate} al {formattedEndDate}
              </CardDescription>
            </div>
            
            <div className="flex gap-2 mt-2 sm:mt-0">
              <Button variant="outline" size="sm" onClick={selectPreviousWeek}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Semana Anterior
              </Button>
              <Button variant="outline" size="sm" onClick={selectCurrentWeek}>
                Semana Actual
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="driver">Solo Choferes</SelectItem>
                <SelectItem value="helper">Solo Ayudantes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Resumen de comisiones */}
              {groupedCommissions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedCommissions.map((group) => (
                    <Card key={`${group.userId}-${group.userRole}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <Avatar className="h-10 w-10 mr-2">
                              <AvatarFallback>{getInitials(group.userName)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{group.userName}</p>
                              <Badge variant="outline" className={`${
                                group.userRole === "driver" 
                                  ? "bg-blue-50 text-blue-700 border-blue-200" 
                                  : "bg-green-50 text-green-700 border-green-200"
                              }`}>
                                {group.userRole === "driver" ? "Chofer" : "Ayudante"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex flex-col">
                            <span className="text-muted-foreground">Entregas:</span>
                            <span className="font-semibold">{group.productCount} productos</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-muted-foreground">Comisiones:</span>
                            <span className="font-semibold">{group.commissionCount}</span>
                          </div>
                          <div className="flex flex-col col-span-2">
                            <span className="text-muted-foreground">Total Comisiones:</span>
                            <span className="font-bold text-lg">RD$ {group.totalAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-red-500">Pendiente:</span>
                            <span className="font-medium">RD$ {group.pendingAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-green-600">Pagado:</span>
                            <span className="font-medium">RD$ {group.paidAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
                  <DatabaseIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-600">No hay comisiones</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    No se encontraron comisiones para el período seleccionado
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3. Registro de Pagos

```tsx
function PayCommissionDialog({ commission, isOpen, onClose, onSubmit }) {
  const form = useForm({
    defaultValues: {
      paymentDate: new Date(),
      paymentReference: "",
      notes: ""
    },
    resolver: zodResolver(z.object({
      paymentDate: z.date(),
      paymentReference: z.string().min(3, "Ingrese una referencia válida"),
      notes: z.string().optional()
    }))
  });
  
  const handleSubmit = (data) => {
    onSubmit({
      id: commission.id,
      ...data
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Pagar Comisión</DialogTitle>
          <DialogDescription>
            Complete la información para marcar esta comisión como pagada
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Pago</FormLabel>
                  <FormControl>
                    <DatePicker
                      selected={field.value}
                      onChange={field.onChange}
                      className="w-full"
                      maxDate={new Date()}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="paymentReference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referencia de Pago</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ej: Transferencia #12345" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Notas adicionales sobre el pago" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-between pt-4">
              <div>
                <div className="text-sm font-medium">Monto a pagar:</div>
                <div className="text-lg font-bold">RD$ {parseFloat(commission?.totalAmount).toFixed(2)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Por {commission?.productCount} productos entregados
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Confirmar Pago
                </Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### 4. Vista para Choferes y Ayudantes

```tsx
function UserCommissions() {
  const { user } = useCurrentUser();
  const [dateRange, setDateRange] = useState([
    new Date(new Date().setDate(new Date().getDate() - 30)), 
    new Date()
  ]);
  
  const { data: userCommissions, isLoading } = useQuery({
    queryKey: ["user-commissions", user.id, dateRange],
    queryFn: async () => {
      return apiRequest(
        "GET", 
        `/api/users/${user.id}/commissions?startDate=${dateRange[0].toISOString()}&endDate=${dateRange[1].toISOString()}`
      ).then(res => res.json());
    }
  });
  
  const totalPending = userCommissions?.filter(c => c.status === "pending")
    .reduce((sum, c) => sum + parseFloat(c.totalAmount), 0) || 0;
    
  const totalEarned = userCommissions?.filter(c => c.status === "paid")
    .reduce((sum, c) => sum + parseFloat(c.totalAmount), 0) || 0;
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Mis Comisiones</CardTitle>
          <CardDescription>
            Revise sus comisiones como {user.role === "driver" ? "chofer" : "ayudante"}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-medium text-blue-700">Pendiente de pago</h3>
                    <p className="text-2xl font-bold text-blue-900">RD$ {totalPending.toFixed(2)}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-medium text-green-700">Total cobrado</h3>
                    <p className="text-2xl font-bold text-green-900">RD$ {totalEarned.toFixed(2)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            className="mb-4"
          />
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : (
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="pending">Pendientes</TabsTrigger>
                <TabsTrigger value="paid">Pagadas</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                <UserCommissionsList commissions={userCommissions} />
              </TabsContent>
              
              <TabsContent value="pending">
                <UserCommissionsList 
                  commissions={userCommissions.filter(c => c.status === "pending")} 
                />
              </TabsContent>
              
              <TabsContent value="paid">
                <UserCommissionsList 
                  commissions={userCommissions.filter(c => c.status === "paid")} 
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

## Plan de Implementación

Para implementar este sistema de comisiones, se seguirán estos pasos:

1. **Fase 1: Modelo de Datos (Semana 1)**
   - Actualizar el esquema en `shared/schema.ts`
   - Agregar campos de comisión en productos
   - Crear nuevas tablas para comisiones y detalles
   - Ejecutar la migración con `npm run db:push`

2. **Fase 2: Backend (Semana 1-2)**
   - Implementar el servicio de cálculo de comisiones
   - Crear endpoints API para gestionar comisiones
   - Integrar con el sistema existente de rutas y órdenes

3. **Fase 3: Interfaz de Administración (Semana 2-3)**
   - Actualizar formulario de productos para incluir comisiones
   - Desarrollar el panel administrativo para comisiones
   - Implementar filtros y visualizaciones
   - Desarrollar la funcionalidad de pago de comisiones

4. **Fase 4: Interfaz para Usuarios (Semana 3)**
   - Crear vista de comisiones para choferes
   - Crear vista de comisiones para ayudantes
   - Implementar historial de comisiones

5. **Fase 5: Pruebas e Implementación (Semana 4)**
   - Pruebas con datos reales
   - Ajustes y correcciones
   - Implementación en producción
   - Capacitación a usuarios administradores

## Ventajas de este Sistema

1. **Fácil Configuración**: Los administradores pueden marcar productos comisionables y establecer valores fijos.

2. **Transparencia**: Tanto administradores como usuarios pueden verificar comisiones en detalle.

3. **Automatización**: Cálculo semanal automático que reduce errores y tiempo de administración.

4. **Flexibilidad**: Diferenciación clara entre comisiones para choferes y ayudantes.

5. **Trazabilidad**: Seguimiento detallado por producto entregado y por ruta.

6. **Sistema de Pago**: Proceso claro para registrar pagos de comisiones.

Este sistema crea un flujo completo y transparente para las comisiones, desde la configuración inicial de productos hasta el pago final a choferes y ayudantes.