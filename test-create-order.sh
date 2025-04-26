#!/bin/bash

echo "=== PRUEBA DE CREACIÓN DE PEDIDO EN SISTEMA MULTI-TENANT ==="
echo "Prueba #1: Creación de pedido sin autenticación"
curl -X POST http://localhost:5000/orders \
  -H "Content-Type: application/json" \
  -v \
  -d '{
    "customerId": 1,
    "orderType": "regular",
    "status": "pending",
    "date": "2025-04-26T14:00:00.000Z",
    "total": "150.00",
    "notes": "Pedido de prueba sin autenticación",
    "preferredDeliveryTime": "2025-04-27T14:00:00.000Z"
  }' | head -n 20

echo -e "\n\n=== Prueba #2: Verificar diagnóstico de contexto ==="
curl http://localhost:5000/diagnostic/tenant-context | jq .

