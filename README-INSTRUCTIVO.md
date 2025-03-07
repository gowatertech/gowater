
# Instructivo Interactivo - GoWater 🚰

## Introducción

Bienvenido al instructivo interactivo de GoWater, un sistema completo para la gestión de entregas de agua con optimización de rutas y administración zonal. Este documento te guiará a través de las principales funcionalidades de la aplicación.

## Índice

1. [Inicio y Acceso](#inicio-y-acceso)
2. [Panel de Control](#panel-de-control)
3. [Gestión de Clientes](#gestión-de-clientes)
4. [Rutas y Entregas](#rutas-y-entregas)
5. [Inventario](#inventario)
6. [Facturación](#facturación)
7. [Usuarios y Permisos](#usuarios-y-permisos)
8. [Configuración](#configuración)
9. [Uso Local de la Aplicación](#uso-local-de-la-aplicación)

## Inicio y Acceso

Para acceder a la aplicación:

1. Abre tu navegador web
2. Ingresa la URL proporcionada
3. Introduce tus credenciales de usuario
4. Selecciona tu idioma preferido (Español/Inglés)

## Panel de Control

El panel principal muestra:

- Resumen de entregas pendientes
- Estadísticas de ventas
- Mapas de rutas activas
- Alertas de inventario
- Actividad reciente

## Gestión de Clientes

Para administrar clientes:

1. Accede a la sección "Clientes" desde el menú lateral
2. Para añadir un nuevo cliente:
   - Haz clic en "Nuevo Cliente"
   - Completa la información requerida (nombre comercial, RNC, contacto, etc.)
   - Especifica ubicación y zona
   - Establece límites de crédito si aplica
   - Guarda los cambios

3. Para editar un cliente existente:
   - Busca el cliente en la lista
   - Selecciona el ícono de edición
   - Modifica los campos necesarios
   - Guarda los cambios

## Rutas y Entregas

La optimización de rutas permite:

1. Crear nuevas rutas:
   - Selecciona "Rutas" en el menú lateral
   - Haz clic en "Nueva Ruta"
   - Selecciona la zona y los clientes
   - Asigna conductor y vehículo
   - La aplicación calculará la ruta óptima automáticamente

2. Seguimiento en tiempo real:
   - Visualiza la ubicación de los vehículos en el mapa
   - Recibe notificaciones de entregas completadas
   - Ajusta rutas según necesidades

## Inventario

La gestión de inventario permite:

1. Control de productos:
   - Visualiza existencias actuales
   - Añade nuevos productos
   - Registra entradas y salidas

2. Carga de productos:
   - Registra nuevos lotes de producción
   - Asigna fechas de producción y vencimiento
   - Controla la trazabilidad

## Facturación

El sistema de facturación permite:

1. Generar facturas:
   - Selecciona el cliente
   - Añade productos
   - Aplica descuentos si corresponde
   - Emite factura con RNC

2. Gestionar pagos:
   - Registra pagos recibidos
   - Controla cuentas por cobrar
   - Genera reportes financieros

## Usuarios y Permisos

Administración de usuarios:

1. Tipos de usuario:
   - Administradores: acceso completo
   - Supervisores: gestión operativa
   - Cajeros: facturación y pagos
   - Choferes: acceso a rutas asignadas
   - Ayudantes: apoyo logístico

2. Gestión de permisos:
   - Asigna o revoca permisos específicos
   - Configura zonas de operación por usuario

## Configuración

Personaliza la aplicación:

1. Configuración general:
   - Ajustes de empresa
   - Preferencias de sistema
   - Opciones de facturación

2. Configuración de zonas:
   - Define nuevas zonas geográficas
   - Establece límites territoriales
   - Asigna supervisores por zona

## Uso Local de la Aplicación

Para utilizar GoWater localmente:

1. Descarga del código:
   - Opción 1: Descarga como ZIP desde Replit
   - Opción 2: Clona el repositorio usando Git

2. Configuración del entorno local:
   - Instala Node.js (versión 20.x)
   - Instala PostgreSQL (versión 16)
   - Configura las variables de entorno necesarias

3. Instalación y ejecución:
   ```bash
   # Instalar dependencias
   npm install
   
   # Iniciar en modo desarrollo
   npm run dev
   
   # Compilar para producción
   npm run build
   
   # Iniciar en modo producción
   npm run start
   ```

4. Acceso a la aplicación:
   - Abre tu navegador
   - Visita: http://localhost:5000

---

Este instructivo está diseñado para ayudarte a utilizar todas las funcionalidades de GoWater. Si necesitas ayuda adicional, no dudes en contactar al equipo de soporte.
