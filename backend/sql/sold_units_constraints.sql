-- Constraints e índice para sold_units (idempotente)
-- Valores permitidos:
--   status: EN_USO | SOLD | RETIRED | CONSIGNED
--   origin: TERCEROS | WOLF_HARD

BEGIN;

-- Drop si existe para evitar errores al re-ejecutar
ALTER TABLE sold_units DROP CONSTRAINT IF EXISTS sold_units_status_check;
ALTER TABLE sold_units DROP CONSTRAINT IF EXISTS sold_units_origin_check;

-- Crear checks sin validar (por si hay datos históricos fuera de rango)
ALTER TABLE sold_units
  ADD CONSTRAINT sold_units_status_check
    CHECK (status IN ('EN_USO','SOLD','RETIRED','CONSIGNED'))
    NOT VALID;

ALTER TABLE sold_units
  ADD CONSTRAINT sold_units_origin_check
    CHECK (origin IN ('TERCEROS','WOLF_HARD'))
    NOT VALID;

-- Índice opcional por status si se filtra mucho por ese campo
CREATE INDEX IF NOT EXISTS idx_sold_units_status ON sold_units(status);

COMMIT;

-- Cuando verifiques que los datos cumplen, valida las constraints (ejecutar aparte):
-- ALTER TABLE sold_units VALIDATE CONSTRAINT sold_units_status_check;
-- ALTER TABLE sold_units VALIDATE CONSTRAINT sold_units_origin_check;
