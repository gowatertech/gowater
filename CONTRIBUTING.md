# Guía de Contribución

Gracias por tu interés en contribuir a GoWater. Esta guía te ayudará a configurar el entorno de desarrollo y a entender nuestro proceso de contribución.

## Primeros Pasos

### Configuración del Entorno de Desarrollo

1. Asegúrate de tener instalado Node.js (v18 o superior) y PostgreSQL (v14 o superior).
2. Clona el repositorio:
   ```
   git clone https://github.com/tu-usuario/gowater.git
   cd gowater
   ```
3. Instala las dependencias:
   ```
   npm install
   ```
4. Crea un archivo `.env` basado en `.env.example` y configura las variables necesarias.
5. Ejecuta las migraciones de la base de datos:
   ```
   npm run db:push
   ```
6. Inicia el servidor de desarrollo:
   ```
   npm run dev
   ```

## Flujo de Trabajo para Contribuciones

1. Crea una nueva rama para tu funcionalidad o corrección:
   ```
   git checkout -b feature/nombre-de-la-funcionalidad
   ```
   o
   ```
   git checkout -b fix/nombre-del-error
   ```

2. Realiza tus cambios siguiendo las convenciones de código del proyecto.

3. Asegúrate de que todos los tests pasen (si los hay):
   ```
   npm test
   ```

4. Haz commit de tus cambios siguiendo las [convenciones de commit](https://www.conventionalcommits.org/):
   ```
   git commit -m "feat: descripción de la nueva funcionalidad"
   ```
   o
   ```
   git commit -m "fix: descripción de la corrección"
   ```

5. Envía tus cambios al repositorio:
   ```
   git push origin nombre-de-tu-rama
   ```

6. Crea un Pull Request detallando los cambios realizados.

## Convenciones de Código

- Usa TypeScript para todo el código nuevo.
- Sigue las pautas de estilo de código del proyecto (utilizamos ESLint y Prettier).
- Asegúrate de documentar todas las funciones y componentes nuevos.
- Utiliza componentes de Shadcn UI cuando sea posible en lugar de crear nuevos.
- Mantén la estructura de archivos existente.

## Estructura de la Base de Datos

Todos los modelos de base de datos se definen en `shared/schema.ts` utilizando Drizzle ORM. Para añadir o modificar modelos, sigue estos pasos:

1. Modifica el archivo `shared/schema.ts` agregando tus nuevas tablas o columnas.
2. Utiliza `npm run db:push` para actualizar el esquema de la base de datos.

## Guía de Arquitectura Multi-Tenant

El proyecto utiliza una arquitectura multi-tenant donde cada empresa tiene sus propios datos aislados. Ten en cuenta:

1. Todas las consultas a la base de datos deben filtrar por `companyId` para asegurar la separación de datos.
2. Utiliza las funciones helpers en `server/company-db.ts` para agregar automáticamente el filtrado por compañía.
3. Las rutas y controladores deben validar que el usuario tenga acceso a la compañía correcta.

## Reportar Problemas

Si encuentras un error o tienes una sugerencia, por favor crea un Issue en GitHub con la siguiente información:

- Descripción clara y concisa del problema
- Pasos para reproducir el error
- Comportamiento esperado vs. comportamiento actual
- Capturas de pantalla (si aplica)
- Información adicional que pueda ser útil

## Preguntas o Dudas

Si tienes alguna pregunta que no esté cubierta en esta guía, no dudes en abrir un Issue con la etiqueta "pregunta".