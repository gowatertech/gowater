# Implementación de Creación de Usuario en la Plataforma Administrativa

## Objetivo
Implementar la creación de usuarios en la plataforma administrativa web, con las siguientes características:
- Cuando se crea un usuario con rol de administrador de empresa (company_admin), debe crearse automáticamente un usuario correspondiente en la compañía.
- Con este usuario creado, la empresa debe poder acceder a sus datos en la plataforma.

## Análisis del Código Actual

### Estructura de Datos

#### Usuarios de Plataforma vs. Usuarios de Compañía
El sistema tiene dos tipos de usuarios:

1. **Usuarios de Plataforma** (`platform_users`):
   - Administradores de la plataforma (`platform_admin`)
   - Administradores de empresa (`company_admin`)
   - Tabla: `platform_users`

2. **Usuarios de Compañía** (`users`):
   - Personal de las empresas: admin, supervisor, cashier, driver, assistant
   - Tabla: `users`

#### Relación entre Tablas
- La tabla `user_companies` relaciona usuarios de plataforma con empresas.
- Un usuario de plataforma puede estar asociado a múltiples empresas.
- Los usuarios de compañía tienen un campo `companyId` que indica a qué empresa pertenecen.

### Funcionalidad Actual de Creación/Sincronización

En la función de asignación de usuarios a empresas, existe código que intenta crear un usuario de compañía cuando se asigna un usuario de plataforma a una empresa:

```typescript
// En server/platform-routes.ts - endpoint /user-company-assignment
// Crear usuario en la compañía si no existe
try {
  // Verificar si el usuario ya existe en la compañía por email
  // Si no existe o es un company_admin, se crea el usuario
  // ...
  if (shouldCreateUser) {
    // Determinar el rol equivalente en la compañía según el rol en plataforma
    let companyRole;
    switch(platformUser.role) {
      case 'platform_admin':
        companyRole = 'admin';
        break;
      case 'company_admin':
        companyRole = 'admin';
        break;
      // ...
    }
    
    // Necesitamos la contraseña en texto plano para el hash
    let plainPassword = platformUser.password;
    
    // Hash de contraseña para usuario de compañía
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    
    // Preparar objeto de usuario con todos los campos requeridos
    const userData = {
      name: platformUser.name,
      username: possibleUsername,
      email: platformUser.email,
      password: hashedPassword,
      role: companyRole,
      companyId,
      active: true
    };
    
    // Insertar usuario en la compañía
    const result = await db.insert(users).values(userData).returning();
  }
}
```

## Problemas Identificados

1. **Sincronización Incompleta**: 
   - El código actual para sincronizar usuarios solo se ejecuta en la asignación de usuarios a empresas, pero no durante la creación inicial de usuarios.
   - Cuando se crea un usuario de tipo `company_admin` desde la interfaz de administración, no se crea automáticamente el usuario correspondiente en la compañía.

2. **Manejo de Contraseñas**:
   - La contraseña del usuario de plataforma ya está hasheada cuando se intenta usar para crear el usuario de compañía.
   - El código actual intenta detectar si la contraseña está hasheada y usa una por defecto, pero este enfoque es frágil.

3. **Verificación de Existencia**:
   - La búsqueda para verificar si un usuario ya existe podría mejorarse.
   - Actualmente intenta buscar por email y nombre de usuario, pero si hay errores en la búsqueda, el proceso falla.

4. **Manejo de Contexto de Compañía**:
   - El código usa `companyDbHelper.setCurrentCompanyId(companyId)` para establecer temporalmente la compañía, pero si hay errores, podría no restaurarse el contexto original.

## Plan de Implementación

### 1. Extender la Creación de Usuarios de Plataforma

Modificar el endpoint `/platform-users` para que cuando se cree un usuario de tipo `company_admin`, se cree automáticamente el usuario correspondiente en la compañía:

```typescript
router.post("/platform-users", requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const userData = { ...req.body };
    
    // Hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    userData.password = hashedPassword;
    
    const validatedData = insertPlatformUserSchema.parse(userData);
    const user = await platformStorage.createPlatformUser(validatedData);
    
    // Si es un company_admin, crear automáticamente el usuario en la compañía
    if (user.role === 'company_admin' && user.companyId) {
      await createCompanyUserFromPlatformUser(user, userData.password); // Pasar la contraseña original
    }
    
    // No devolver la contraseña
    const { password, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error: any) {
    console.error("Error al crear usuario:", error);
    res.status(400).json({ message: error.message || "Error al crear usuario" });
  }
});
```

### 2. Refactorizar Función de Creación de Usuario de Compañía

Crear una función independiente para la creación de usuarios de compañía a partir de usuarios de plataforma:

```typescript
/**
 * Crea un usuario de compañía a partir de un usuario de plataforma
 * @param platformUser Usuario de plataforma
 * @param plainPassword Contraseña en texto plano (antes del hash)
 */
async function createCompanyUserFromPlatformUser(
  platformUser: PlatformUser, 
  plainPassword: string
): Promise<void> {
  if (!platformUser.companyId) {
    console.log(`[SYNC USER] Error: El usuario no tiene companyId, no se puede crear usuario de compañía`);
    return;
  }
  
  const companyId = platformUser.companyId;
  
  // Establecer companyId temporalmente para la búsqueda
  const currentCompanyId = companyDbHelper.getCurrentCompanyId();
  companyDbHelper.setCurrentCompanyId(companyId);
  
  try {
    // Verificar si el usuario ya existe
    const possibleUsername = `${platformUser.email.split('@')[0]}_${companyId}`;
    const existingUserByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, platformUser.email))
      .limit(1);
      
    if (existingUserByEmail.length > 0) {
      console.log(`[SYNC USER] El usuario ya existe con el email ${platformUser.email}`);
      return;
    }
    
    // Determinar el rol equivalente en la compañía
    const companyRole = platformUser.role === 'company_admin' ? 'admin' : 'supervisor';
    
    // Hash de la contraseña para usuario de compañía
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    
    // Crear el usuario en la compañía
    const userData = {
      name: platformUser.name,
      username: possibleUsername,
      email: platformUser.email,
      password: hashedPassword,
      role: companyRole,
      companyId,
      active: true
    };
    
    await db.insert(users).values(userData).returning();
    console.log(`[SYNC USER] Usuario de compañía creado para ${platformUser.email} en compañía ${companyId}`);
  } catch (error) {
    console.error(`[SYNC USER] Error al crear usuario de compañía:`, error);
  } finally {
    // Restaurar el companyId original
    if (currentCompanyId) {
      companyDbHelper.setCurrentCompanyId(currentCompanyId);
    }
  }
}
```

### 3. Mejorar Asignación de Usuarios a Empresas

Modificar la función de asignación de usuarios a empresas para reutilizar la nueva función de creación:

```typescript
router.post("/user-company-assignment", requireCompanyAdmin, async (req: Request, res: Response) => {
  try {
    const { userId, companyId, role = 'standard' } = req.body;
    
    // Validaciones de permisos y datos...
    
    // Obtener el usuario de plataforma
    const platformUser = await platformStorage.getPlatformUser(userId);
    if (!platformUser) {
      return res.status(404).json({ message: 'Usuario de plataforma no encontrado' });
    }
    
    // Insertar la asignación
    const [assignment] = await platformDb
      .insert(userCompanies)
      .values({ userId, companyId, role })
      .returning();
    
    // Si es un company_admin, usar una contraseña predeterminada segura para el usuario de compañía
    if (platformUser.role === 'company_admin') {
      // Clonar el usuario y establecer temporalmente el companyId
      const userWithCompany = { ...platformUser, companyId };
      const tempPassword = 'AdminTemp' + Math.floor(100000 + Math.random() * 900000);
      
      await createCompanyUserFromPlatformUser(userWithCompany, tempPassword);
    }
    
    res.status(201).json({
      message: "Usuario asignado a empresa correctamente",
      assignment
    });
  } catch (error) {
    console.error("Error al asignar usuario:", error);
    res.status(400).json({ message: error.message || "Error al asignar usuario" });
  }
});
```

### 4. Agregar Endpoint para Sincronización Manual

Crear un nuevo endpoint para sincronizar manualmente usuarios de plataforma a empresas:

```typescript
router.post("/sync-users-to-company/:companyId", requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId);
    
    // Obtener todos los usuarios company_admin asignados a esta empresa
    const companyAdmins = await platformDb
      .select()
      .from(platformUsers)
      .where(
        and(
          eq(platformUsers.role, 'company_admin'),
          eq(platformUsers.companyId, companyId)
        )
      );
    
    // Para cada admin de empresa, crear su usuario correspondiente
    let createdCount = 0;
    for (const admin of companyAdmins) {
      // Generar una contraseña temporal segura
      const tempPassword = 'AdminTemp' + Math.floor(100000 + Math.random() * 900000);
      
      await createCompanyUserFromPlatformUser(admin, tempPassword);
      createdCount++;
    }
    
    res.json({
      message: `Sincronización completada. Se procesaron ${companyAdmins.length} usuarios, se crearon ${createdCount} usuarios de compañía.`
    });
  } catch (error) {
    console.error("Error al sincronizar usuarios:", error);
    res.status(400).json({ message: error.message || "Error al sincronizar usuarios" });
  }
});
```

## Recomendaciones Adicionales

1. **Mejorar Gestión de Contraseñas**:
   - Almacenar temporalmente la contraseña en texto plano para la creación del usuario de compañía puede representar un riesgo de seguridad.
   - Considerar implementar un sistema de reinicio de contraseña obligatorio para nuevos usuarios de compañía.

2. **Transacciones de Base de Datos**:
   - Implementar transacciones para asegurar que tanto la creación del usuario de plataforma como la del usuario de compañía se completen exitosamente o fallen juntas.

3. **Mejoras en la Interfaz de Usuario**:
   - Actualizar la interfaz para mostrar claramente que cuando se crea un administrador de empresa, se creará automáticamente un usuario en la compañía correspondiente.
   - Incluir opciones para enviar credenciales por correo electrónico.

4. **Logs y Monitoreo**:
   - Mejorar los logs para facilitar el diagnóstico de problemas en la sincronización de usuarios.
   - Considerar agregar un sistema de notificaciones para informar sobre errores en la creación de usuarios.

5. **Pruebas**:
   - Crear casos de prueba específicos para verificar la sincronización de usuarios entre plataforma y compañías.