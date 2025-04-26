#!/bin/bash

echo "=== PRUEBA DE API CON AUTENTICACIÓN ==="

# 1. Primero hacer login
echo "1. Haciendo login para obtener sesión..."
COOKIE_JAR="./cookies.txt"

curl -c $COOKIE_JAR -X POST http://localhost:5000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

echo -e "\n\n2. Verificando contexto de tenant con sesión..."
curl -b $COOKIE_JAR http://localhost:5000/diagnostic/tenant-context

# Limpiar 
rm -f $COOKIE_JAR

