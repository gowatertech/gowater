# Copia de Datos a Producción

Este script copia el super administrador y los planes desde la base de datos de desarrollo a la base de datos de producción.

## ¿Qué copia?

1. **Super Administrador**: Usuario de plataforma con email `superadmin@gowater.com`
2. **Planes**: Todos los planes activos configurados en desarrollo

## Requisitos

1. Debes configurar la variable de entorno `PRODUCTION_DATABASE_URL` con la URL de tu base de datos de producción
2. La URL puede ser cualquier base de datos PostgreSQL estándar (RDS, Neon, Supabase, GCP Cloud SQL, etc.)
3. El script usa el driver estándar de PostgreSQL (`pg`) compatible con todas las URLs PostgreSQL

## Cómo usar

### Opción 1: Configurar variable de entorno temporalmente

```bash
PRODUCTION_DATABASE_URL="postgresql://..." tsx scripts/copy-to-production.ts
```

### Opción 2: Agregar al archivo .env (no recomendado para producción)

```
PRODUCTION_DATABASE_URL=postgresql://...
```

Luego ejecutar:
```bash
tsx scripts/copy-to-production.ts
```

## Seguridad

El script tiene las siguientes protecciones:

- ✅ Verifica que `DATABASE_URL` y `PRODUCTION_DATABASE_URL` estén configuradas
- ✅ Verifica que las URLs sean diferentes (no copia a la misma base de datos)
- ✅ No sobrescribe datos existentes (verifica antes de insertar)
- ✅ Preserva las contraseñas hasheadas del super admin

## Resultado esperado

```
🚀 Iniciando copia de datos a producción...
📊 Origen: DATABASE_URL (desarrollo)
🎯 Destino: PRODUCTION_DATABASE_URL (producción)

🔐 Copiando Super Admin a producción...
✅ Super admin copiado a producción
  🆔 ID: 1
  📧 Email: superadmin@gowater.com
  👤 Nombre: Super Administrador

📋 Copiando planes a producción...
📦 Encontrados 4 planes en desarrollo
  ✅ Plan "Plan Negocio" copiado a producción
  ✅ Plan "Plan Profesional" copiado a producción
  ✅ Plan "Plan Empresarial" copiado a producción
  ✅ Plan "Plan Basico" copiado a producción

📊 Resumen:
  ✅ Copiados: 4
  ⏭️  Omitidos (ya existían): 0

🎉 ¡Proceso completado exitosamente!

📝 Credenciales del Super Admin:
  📧 Email: superadmin@gowater.com
  🔑 Contraseña: SuperAdmin123
```

## Notas importantes

- Si el super admin ya existe en producción, no se sobrescribe
- Si un plan con el mismo nombre ya existe en producción, se omite
- Las contraseñas se copian ya hasheadas (no se rehashean)
- El script es idempotente: se puede ejecutar múltiples veces sin problemas
