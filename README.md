# GoWater - Plataforma de Gestión de Rutas y Productos

<div align="center">
  <img src="./client/src/assets/logo-gowater.svg" alt="GoWater Logo" width="250px" />
  <p>Una plataforma sofisticada multi-tenant para la gestión de rutas de vehículos y productos con gestión avanzada de usuarios y control de acceso basado en roles.</p>
  <div>
    <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version 1.0.0" />
    <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License MIT" />
    <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node >= 18.0.0" />
    <img src="https://img.shields.io/badge/TypeScript-5.0.2-blue.svg" alt="TypeScript 5.0.2" />
  </div>
</div>

## 📋 Descripción

GoWater es una aplicación web completa diseñada específicamente para empresas de distribución de agua. Permite gestionar eficientemente las rutas de entrega, inventario de productos, clientes y pagos. La plataforma se destaca por su arquitectura multi-tenant que permite a múltiples empresas operar de forma segura e independiente dentro del mismo sistema.

### ✨ Características Principales

- **Gestión de Rutas Inteligente**: Optimice las rutas de entrega con un sistema que reduce tiempos y costos de transporte.
- **Control de Inventario**: Registro preciso de inventario, productos y envases retornables.
- **Gestión de Clientes**: Historial completo de clientes y mejora de relaciones.
- **Seguridad Avanzada**: Protección de datos con sistema de seguridad de nivel empresarial.
- **Soporte 24/7**: Equipo de soporte disponible en cualquier momento.
- **Aplicación Móvil**: Acceso a toda la información desde cualquier lugar.
- **Arquitectura Multi-tenant**: Soporte para múltiples empresas con datos aislados.

## 🛠️ Tecnologías Utilizadas

- **Frontend**: 
  - React con TypeScript
  - Componentes de Shadcn UI
  - Tailwind CSS para estilos
  - React Query para gestión de estado y caché
  - React Hook Form para formularios
  - i18next para internacionalización
  - Zod para validación de datos
  - PWA con soporte offline

- **Backend**: 
  - Node.js con Express
  - TypeScript end-to-end
  - API RESTful

- **Base de Datos**: 
  - PostgreSQL 
  - Drizzle ORM para modelos y migraciones

- **Autenticación**: 
  - Sistema basado en sesiones 
  - Passport.js
  - Control de acceso basado en roles (RBAC)

- **Mapas y Ubicación**: 
  - Integración con Leaflet
  - Geolocalización en tiempo real

## 🏗️ Arquitectura

- **Multi-tenant**: Aislamiento de datos entre empresas
- **Mobile-first**: Interfaces responsivas optimizadas para dispositivos móviles
- **Microservicios**: Separación clara de responsabilidades por dominio
- **API RESTful**: Comunicación cliente-servidor estadarizada
- **Tiempo real**: Actualizaciones instantáneas en la aplicación del conductor

## 🚀 Instalación y Configuración

### Requisitos Previos

- Node.js (versión 18 o superior)
- PostgreSQL (versión 14 o superior)

### Pasos para Instalación

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/gowater.git
   cd gowater
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Configurar variables de entorno:
   ```bash
   cp .env.example .env
   # Editar .env con tus configuraciones
   ```

4. Inicializar la base de datos:
   ```bash
   npm run db:push
   ```

5. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

### Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run start` - Inicia la aplicación en modo producción
- `npm run check` - Verifica los tipos de TypeScript
- `npm run db:push` - Actualiza la base de datos según el esquema
- `npm run db:studio` - Abre Drizzle Studio para visualizar/editar datos

## 📁 Estructura del Proyecto

```
/
├── client/                         # Código del frontend
│   ├── src/             
│   │   ├── assets/                 # Imágenes, iconos y recursos estáticos
│   │   ├── components/             # Componentes reutilizables
│   │   │   ├── dashboard/          # Componentes específicos del dashboard
│   │   │   ├── landing/            # Componentes de la landing page
│   │   │   ├── layouts/            # Estructuras de página (sidebar, header)
│   │   │   ├── map/                # Componentes para mapas y geolocalización
│   │   │   ├── routes/             # Componentes de gestión de rutas
│   │   │   ├── sync/               # Componentes para sincronización offline
│   │   │   ├── theme/              # Componentes de tematización
│   │   │   └── ui/                 # Componentes base de interfaz (shadcn)
│   │   ├── hooks/                  # Hooks personalizados de React
│   │   ├── lib/                    # Utilidades y servicios compartidos
│   │   └── pages/                  # Páginas de la aplicación
│   │       ├── landing/            # Páginas públicas (inicio, planes, contacto)
│   │       ├── dashboard/          # Páginas de administración
│   │       ├── mobile-app/         # Vistas de la aplicación móvil
│   │       ├── reports/            # Módulo de reportes y estadísticas
│   │       └── vehicle-loading/    # Módulo de carga de vehículos
├── server/                         # Código del backend
│   ├── routes/                     # Rutas API para recursos principales
│   ├── services/                   # Servicios de lógica de negocio
│   └── scripts/                    # Scripts de utilidad y migración
└── shared/                         # Código compartido entre frontend y backend
    ├── schema.ts                   # Esquemas de base de datos (Drizzle)
    ├── platform-schema.ts          # Esquemas para la plataforma multi-tenant
    └── company-settings-schema.ts  # Esquemas para configuración de empresas
```

## 📱 Aplicación Móvil

GoWater incluye una aplicación móvil PWA para conductores que permite:

- Ver rutas asignadas y navegación
- Registrar entregas y pagos en tiempo real
- Seguimiento de envases retornables
- Funcionamiento offline con sincronización automática
- Escáner de códigos QR para validación de entregas

## 👥 Contribución

¡Las contribuciones son bienvenidas! Por favor lee las [guías de contribución](CONTRIBUTING.md) antes de enviar un pull request.

## 📄 Licencia

Este proyecto está licenciado bajo los términos de la [licencia MIT](LICENSE).

## 📞 Soporte

Para soporte y consultas, contacta a nuestro equipo a través de:
- Teléfono: +1809-350-2237 (República Dominicana)
- Email: soporte@gowater.com