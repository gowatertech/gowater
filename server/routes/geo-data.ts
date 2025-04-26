import express, { Router } from "express";
import { db } from "../db";
import { provinces, municipalities, cities } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Registra las rutas para datos geográficos (provincias, municipios, etc)
 * que no requieren autenticación ni filtrado por compañía
 */
export function registerGeoDataRoutes(router: Router) {
  // Endpoint para obtener todas las provincias
  router.get("/provinces", async (req, res) => {
    try {
      console.log(`GET /api/geo/provinces - Consultando todas las provincias`);
      
      // Obtenemos todas las provincias sin filtrar por compañía
      let allProvinces = await db
        .select()
        .from(provinces)
        .orderBy(provinces.name);

      console.log(`Provincias encontradas:`, allProvinces.length);
      res.json(allProvinces);
    } catch (error) {
      console.error("Error al obtener provincias:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoint para obtener municipios de una provincia
  router.get("/municipalities/:provinceId", async (req, res) => {
    try {
      const provinceId = parseInt(req.params.provinceId);
      if (isNaN(provinceId)) {
        return res.status(400).json({ error: "ID de provincia inválido" });
      }
      
      console.log(`GET /api/geo/municipalities/${provinceId} - Consultando todos los municipios`);

      // Obtenemos todos los municipios para esta provincia sin filtrar por compañía
      let municipalitiesInProvince = await db
        .select()
        .from(municipalities)
        .where(eq(municipalities.provinceId, provinceId))
        .orderBy(municipalities.name);

      console.log(`Municipios encontrados para provincia ${provinceId}:`, municipalitiesInProvince.length);
      res.json(municipalitiesInProvince);
    } catch (error) {
      console.error("Error al obtener municipios:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoint para obtener ciudades de una provincia
  router.get("/cities/:provinceId", async (req, res) => {
    try {
      const provinceId = parseInt(req.params.provinceId);
      if (isNaN(provinceId)) {
        return res.status(400).json({ error: "ID de provincia inválido" });
      }
      
      console.log(`GET /api/geo/cities/${provinceId} - Consultando todas las ciudades`);

      // Consulta para obtener ciudades y sus municipios
      const citiesInProvince = await db
        .select({
          id: cities.id,
          name: cities.name,
          municipalityId: cities.municipalityId,
          municipalityName: municipalities.name,
        })
        .from(cities)
        .leftJoin(
          municipalities,
          eq(cities.municipalityId, municipalities.id)
        )
        .where(eq(municipalities.provinceId, provinceId));

      console.log(`Ciudades encontradas para provincia ${provinceId}:`, citiesInProvince.length);
      res.json(citiesInProvince);
    } catch (error) {
      console.error("Error al obtener ciudades:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  return router;
}