# Prevención de rutas múltiples por conductor

## Descripción
Este conjunto de cambios implementa un sistema que impide que los conductores inicien múltiples rutas simultáneamente. La mejora ayuda a mantener la integridad operativa evitando confusiones y problemas con rutas paralelas.

## Archivos modificados/creados

### Backend
- `server/routes/api/startRoute.ts` (NUEVO)
  - Implementa un endpoint que valida si el conductor ya tiene una ruta activa
  - Devuelve información detallada sobre la ruta activa existente
  - Actualiza el estado de la ruta y sus pedidos correspondientes

### Frontend
- `client/src/pages/mobile-app/rutas-pendientes/index.tsx`
  - Actualizado para manejar respuestas del nuevo endpoint de validación
  - Muestra notificaciones toast cuando se detecta una ruta activa
  - Ofrece opción para redirigir al conductor a su ruta activa

## Comportamiento
1. Cuando un conductor intenta iniciar una nueva ruta, el sistema verifica si ya tiene una ruta con estado "in_progress"
2. Si existe una ruta activa, se muestra un mensaje de error y se ofrece la opción de ir a la ruta actual
3. Solo se permite iniciar una nueva ruta cuando el conductor no tiene rutas activas pendientes

## Beneficios
- Previene confusiones operativas con múltiples rutas activas
- Mejora la experiencia del usuario alertando sobre rutas incompletas
- Mantiene la integridad de los datos de entrega y seguimiento
- Simplifica la gestión de rutas por conductor

## Pruebas
- Verificado que no se pueden iniciar múltiples rutas simultáneamente
- Comprobado que las notificaciones y redirecciones funcionan correctamente
- Validado el flujo completo desde la vista de rutas pendientes hasta la ruta activa