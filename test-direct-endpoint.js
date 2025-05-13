// Script para probar directamente el endpoint sin pasar por autenticación
import 'dotenv/config';
import express from 'express';
import { poolPromise } from './server/db-connect.js';

// Crear una mini aplicación Express para probar
const app = express();
app.use(express.json());

// Importar y configurar los servicios necesarios
async function setupServices() {
  // Importar el servicio de pedidos recurrentes
  const { recurringOrdersService } = await import('./server/recurring-orders.js');
  
  // Crear un endpoint de prueba
  app.post('/test-generate/:id', async (req, res) => {
    try {
      console.log("Iniciando prueba directa de generación con ID:", req.params.id);
      
      // Obtener el ID del pedido recurrente
      let recurringOrderId = parseInt(req.params.id, 10);
      if (isNaN(recurringOrderId) || recurringOrderId <= 0) {
        return res.status(400).json({ error: "ID inválido" });
      }
      
      // Llamada directa al servicio
      const order = await recurringOrdersService.generateOrderFromRecurring(recurringOrderId);
      res.json({
        success: true,
        message: "Pedido generado exitosamente",
        order
      });
    } catch (error) {
      console.error("Error al generar pedido:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Error desconocido"
      });
    }
  });
  
  // Endpoint para verificar la conexión
  app.get('/ping', (req, res) => {
    res.json({ message: "Servidor de prueba funcionando" });
  });
  
  return { app };
}

// Iniciar el servidor de prueba
async function main() {
  try {
    // Configurar el servidor y servicios
    const { app } = await setupServices();
    
    // Iniciar el servidor en un puerto diferente para no interferir con el principal
    const PORT = 5555;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor de prueba iniciado en http://0.0.0.0:${PORT}`);
      console.log("Endpoints disponibles:");
      console.log(`- http://0.0.0.0:${PORT}/ping (GET) - Verificar que el servidor está funcionando`);
      console.log(`- http://0.0.0.0:${PORT}/test-generate/6 (POST) - Probar generación de pedido desde recurrente ID 6`);
    });
  } catch (error) {
    console.error("Error al iniciar el servidor de prueba:", error);
    process.exit(1);
  }
}

// Ejecutar el script
main().catch(console.error);