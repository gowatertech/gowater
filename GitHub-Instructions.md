# Instrucciones para GitHub

## 1. Preparando los cambios

Para guardar los cambios que hemos hecho al campo de comisión de productos, sigue estos pasos:

```bash
# Crea una nueva rama para los cambios de comisión de productos
git checkout -b feature/product-commission

# Añade los archivos modificados
git add server/routes.ts

# Haz un commit con un mensaje descriptivo
git commit -m "Agrega campo hasCommission a productos y actualiza endpoints"
```

## 2. Subiendo cambios a GitHub

Una vez que hayas hecho commit de tus cambios, puedes subirlos a GitHub:

```bash
# Sube la nueva rama a GitHub
git push origin feature/product-commission
```

## 3. Creando un Pull Request

Después de subir tus cambios:

1. Ve a tu repositorio en GitHub: https://github.com/gowatertech/gowater
2. Verás un mensaje sugiriendo crear un Pull Request para tu nueva rama
3. Haz clic en "Compare & pull request"
4. Añade un título descriptivo como "Agrega campo hasCommission a productos"
5. Describe los cambios realizados:
   - Agregado el campo hasCommission al endpoint GET /api/products
   - Añadida la columna has_commission a la base de datos
   - Todos los productos tienen ahora hasCommission = true por defecto
6. Haz clic en "Create pull request"

## 4. Revisión y Merge

Una vez creado el Pull Request:

1. Revisa los cambios para asegurarte de que todo está correcto
2. Si tienes co-colaboradores, pídeles que revisen el PR
3. Cuando estés satisfecho, haz clic en "Merge pull request"
4. Confirma el merge
5. Ahora puedes eliminar la rama si lo deseas

## 5. Actualizando la rama main local

Después de hacer el merge en GitHub, actualiza tu rama main local:

```bash
# Cambiar a la rama main
git checkout main

# Obtener los últimos cambios
git pull origin main
```

## Información sobre los cambios realizados

### Cambios en el esquema:
La tabla `products` ahora incluye un nuevo campo `hasCommission` (booleano) que indica si el producto tiene comisión (S) o no (N). El valor predeterminado es "S" (true).

### Cambios en la API:
1. Endpoint GET `/api/products` - Modificado para incluir el campo hasCommission en la respuesta
2. Endpoint POST `/api/products/update-all-commission` - Actualiza todos los productos existentes con hasCommission = true

### Base de datos:
Se ha añadido una columna `has_commission` a la tabla `products` con un valor predeterminado de `true`.