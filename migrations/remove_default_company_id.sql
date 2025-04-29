-- Eliminar el valor por defecto de company_id en la tabla routes
ALTER TABLE routes ALTER COLUMN company_id DROP DEFAULT;

-- Confirmar que se ha quitado el valor por defecto
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'routes' AND column_name = 'company_id';