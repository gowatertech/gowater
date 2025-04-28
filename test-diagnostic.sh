#!/bin/bash

# Define colores para mejor legibilidad
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # Sin Color

# Parámetros predeterminados
HOST="localhost:5000"
ZONE_ID=4
COMPANY_ID=15

# Construir la URL para el endpoint de diagnóstico
URL="http://${HOST}/api/diagnostic-no-auth/pending-orders?zoneId=${ZONE_ID}&companyId=${COMPANY_ID}"

echo -e "${BLUE}Probando endpoint de diagnóstico sin autenticación...${NC}"
echo -e "${YELLOW}URL: ${URL}${NC}"

# Hacer la petición y guardar la respuesta
RESPONSE=$(curl -s "${URL}")

# Verificar si la respuesta contiene "diagnostico"
if echo "$RESPONSE" | grep -q "diagnostico"; then
  echo -e "${GREEN}✓ El endpoint respondió correctamente${NC}"
  
  # Formatear y mostrar la respuesta JSON con jq (si está instalado)
  if command -v jq &> /dev/null; then
    echo -e "${BLUE}Detalles de la respuesta:${NC}"
    echo "$RESPONSE" | jq .
  else
    echo -e "${YELLOW}Instala jq para ver una respuesta formateada${NC}"
    echo "$RESPONSE"
  fi
else
  echo -e "${RED}✗ El endpoint falló${NC}"
  echo -e "${YELLOW}Respuesta recibida:${NC}"
  echo "$RESPONSE"
fi