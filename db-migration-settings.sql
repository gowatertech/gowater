-- Migración para añadir columna company_id a la tabla settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS company_id INTEGER NOT NULL DEFAULT 1;

-- Actualizar registros existentes para asignarlos a la compañía predeterminada
UPDATE settings SET company_id = 1 WHERE company_id IS NULL OR company_id = 0;

-- Verificar la actualización
SELECT COUNT(*) FROM settings WHERE company_id IS NULL OR company_id = 0;

-- Agregar índice para mejorar el rendimiento de consultas filtradas por company_id
CREATE INDEX IF NOT EXISTS idx_settings_company_id ON settings(company_id);

-- Muestra información de la tabla para verificación
\d settings