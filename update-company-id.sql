-- Actualizar todas las tablas que tienen registros para asegurar que company_id = 1

-- Obtenemos primero la lista de tablas que tienen el campo company_id
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'company_id' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('UPDATE %I SET company_id = 1 WHERE TRUE', table_record.table_name);
        RAISE NOTICE 'Actualizada tabla: %', table_record.table_name;
    END LOOP;
END $$;