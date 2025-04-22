# GoWater - Plataforma de Gestión de Rutas y Productos

Una plataforma sofisticada multi-tenant para la gestión de rutas de vehículos y productos con gestión avanzada de usuarios y control de acceso basado en roles.

## Descripción

GoWater es una aplicación web completa diseñada específicamente para empresas de distribución de agua. Permite gestionar eficientemente las rutas de entrega, inventario de productos, clientes y pagos.

### Características Principales

- **Gestión de Rutas Inteligente**: Optimice las rutas de entrega con un sistema que reduce tiempos y costos de transporte.
- **Control de Inventario**: Registro preciso de inventario, productos y envases retornables.
- **Gestión de Clientes**: Historial completo de clientes y mejora de relaciones.
- **Seguridad Avanzada**: Protección de datos con sistema de seguridad de nivel empresarial.
- **Soporte 24/7**: Equipo de soporte disponible en cualquier momento.
- **Aplicación Móvil**: Acceso a toda la información desde cualquier lugar.

## Tecnologías Utilizadas

- **Frontend**: React con TypeScript, componentes de Shadcn UI, Tailwind CSS
- **Backend**: Node.js con Express
- **Base de Datos**: PostgreSQL con Drizzle ORM
- **Autenticación**: Sistema basado en sesiones con Passport.js
- **Mapas y Ubicación**: Integración con Leaflet para mapas interactivos

## Arquitectura

- Arquitectura multi-tenant con soporte para múltiples empresas
- Diseño mobile-first con interfaces responsivas
- API RESTful para comunicación cliente-servidor
- Control de acceso basado en roles (RBAC)

## Instalación y Configuración

### Requisitos Previos

- Node.js (versión 18 o superior)
- PostgreSQL (versión 14 o superior)

### Pasos para Instalación

1. Clonar el repositorio:
   ```
   git clone https://github.com/tu-usuario/gowater.git
   cd gowater
   ```

2. Instalar dependencias:
   ```
   npm install
   ```

3. Configurar variables de entorno:
   - Crear un archivo `.env` basado en `.env.example`
   - Configurar la conexión a la base de datos y otras variables necesarias

4. Inicializar la base de datos:
   ```
   npm run db:push
   ```

5. Iniciar el servidor de desarrollo:
   ```
   npm run dev
   ```

## Estructura del Proyecto

```
/
├── client/              # Código del frontend
│   ├── src/             
│   │   ├── components/  # Componentes reutilizables
│   │   ├── pages/       # Páginas de la aplicación
│   │   ├── hooks/       # Hooks personalizados
│   │   └── lib/         # Utilidades y servicios
├── server/              # Código del backend
│   ├── routes/          # Rutas API
│   ├── services/        # Servicios de negocio
│   └── scripts/         # Scripts utilitarios
└── shared/              # Código compartido entre frontend y backend
    └── schema.ts        # Esquemas de base de datos (Drizzle)
```

## Licencia

Este proyecto está licenciado bajo los términos de la licencia MIT.