# GoWater - Sistema de Carga de Vehículos 🚛

## Descripción
Sistema para gestionar la carga de vehículos de reparto de agua, incluyendo asignación de conductores, ayudantes, productos y efectivo inicial.

## Características
- Registro de cargas de vehículos con número único
- Asignación de conductor y ayudante opcional
- Control de efectivo inicial
- Gestión de productos a cargar con cantidades
- Seguimiento del estado de la carga
- Interfaz responsive y amigable

## Estructura del Código

### 1. Schema (Base de Datos)
```typescript
// Schema para la tabla principal de carga de vehículos
export const vehicleLoading = pgTable("vehicle_loading", {
  id: serial("id").primaryKey(),
  loadingNumber: serial("loading_number").unique(),
  date: timestamp("date", { mode: 'string' }).notNull().defaultNow(),
  truckId: integer("truck_id").notNull().references(() => trucks.id),
  driverId: integer("driver_id").notNull().references(() => users.id),
  assistantId: integer("assistant_id").references(() => users.id),
  status: text("status", {
    enum: ["pending", "in_progress", "completed", "cancelled"]
  }).notNull().default("pending"),
  initialCash: decimal("initial_cash", { precision: 10, scale: 2 }).notNull().default("0.00"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: 'string' }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { mode: 'string' }),
});

// Schema para los items de la carga
export const vehicleLoadingItems = pgTable("vehicle_loading_items", {
  id: serial("id").primaryKey(),
  loadingId: integer("loading_id").notNull().references(() => vehicleLoading.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
});

// Schema de validación para inserción
export const insertVehicleLoadingSchema = createInsertSchema(vehicleLoading, {
  truckId: z.number().min(1),
  driverId: z.number().min(1),
  assistantId: z.number().min(1).optional(),
  initialCash: z.string(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.number().min(1),
    quantity: z.number().min(1),
  })),
}).strict();
```

### 2. API Endpoints
```typescript
// Endpoint para crear una nueva carga de vehículo
app.post("/api/vehicle-loading", async (req, res) => {
  try {
    const formattedData = {
      ...req.body,
      initialCash: values.initialCash.toString(),
      truckId: Number(values.truckId),
      driverId: Number(values.driverId),
      assistantId: values.assistantId ? Number(values.assistantId) : undefined,
      items: values.items.map(item => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity)
      }))
    };

    // Validar datos
    const result = insertVehicleLoadingSchema.safeParse(formattedData);
    if (!result.success) {
      return res.status(400).json({ 
        error: "Error de validación",
        details: result.error.format()
      });
    }

    // Crear el registro
    const [loading] = await db
      .insert(vehicleLoading)
      .values(result.data)
      .returning();

    // Crear los items
    if (result.data.items?.length) {
      await db
        .insert(vehicleLoadingItems)
        .values(
          result.data.items.map(item => ({
            loadingId: loading.id,
            ...item
          }))
        );
    }

    res.json(loading);
  } catch (error) {
    console.error("Error al crear carga de vehículo:", error);
    res.status(500).json({ error: String(error) });
  }
});
```

### 3. Componente React - Formulario de Carga
```typescript
export function VehicleLoadingForm({ onSuccess }: VehicleLoadingFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Configuración del formulario
  const form = useForm<InsertVehicleLoading>({
    resolver: zodResolver(insertVehicleLoadingSchema),
    defaultValues: {
      initialCash: "0.00",
      items: []
    }
  });

  // Control de productos dinámicos
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  // Queries para datos necesarios
  const { data: trucks = [] } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const { data: drivers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/drivers", { role: "driver" }],
  });

  const { data: assistants = [] } = useQuery<User[]>({
    queryKey: ["/api/users/drivers", { role: "assistant" }],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Manejo del envío del formulario
  const onSubmit = async (values: InsertVehicleLoading) => {
    try {
      setIsSubmitting(true);

      const formattedData = {
        ...values,
        initialCash: values.initialCash.toString(),
        truckId: Number(values.truckId),
        driverId: Number(values.driverId),
        assistantId: values.assistantId ? Number(values.assistantId) : undefined,
        items: values.items.map(item => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity)
        }))
      };

      const response = await fetch("/api/vehicle-loading", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formattedData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al crear la carga del vehículo");
      }

      toast({
        description: "Carga de vehículo registrada exitosamente",
        duration: 3000,
      });

      onSuccess?.();
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-loading"] });
      form.reset();
    } catch (error) {
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "Error al crear la carga del vehículo",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Campos del formulario */}
      </form>
    </Form>
  );
}
```

### 4. Componente React - Lista de Cargas
```typescript
// Utilidad para colores de estado
const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-green-100 text-green-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Componente de lista
export default function VehicleLoadingPage() {
  const [showForm, setShowForm] = useState(false);

  const { data: loadings = [], isLoading } = useQuery<VehicleLoading[]>({
    queryKey: ["/api/vehicle-loading"],
  });

  return (
    <div className="space-y-4 p-4">
      {/* Encabezado y botón de nueva carga */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Carga de Vehículos</h1>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Carga
        </Button>
      </div>

      {/* Formulario modal */}
      {showForm && (
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Nueva Carga de Vehículo</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowForm(false)}
            >
              ✕
            </Button>
          </div>
          <VehicleLoadingForm 
            onSuccess={() => setShowForm(false)} 
          />
        </Card>
      )}

      {/* Lista de cargas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loadings.map((loading) => (
          <Card 
            key={loading.id} 
            className="p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">#{loading.loadingNumber}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(loading.status)}`}>
                  {loading.status === "completed" ? "Completado" :
                   loading.status === "in_progress" ? "En Progreso" :
                   loading.status === "cancelled" ? "Cancelado" :
                   "Pendiente"}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Fecha: {new Date(loading.date).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600">
                Efectivo inicial: RD$ {loading.initialCash}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

## Tecnologías Utilizadas
- React con TypeScript
- Tailwind CSS para estilos
- TanStack Query para manejo de estado y caché
- Zod para validación de datos
- Drizzle ORM para interacción con base de datos
- PostgreSQL como base de datos

## Características de UX/UI
- Diseño responsive
- Feedback visual con toast notifications
- Estados de carga claramente diferenciados por colores
- Formulario dinámico para productos
- Validación en tiempo real
