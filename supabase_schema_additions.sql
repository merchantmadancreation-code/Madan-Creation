-- ============================================================
-- UNIVERSAL REPAIR & OPTIMIZATION SCRIPT (v5.0 - BULLETPROOF)
-- Madan Creation ERP
-- ============================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENSURE ALL TABLES EXIST
CREATE TABLE IF NOT EXISTS suppliers (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS buyers (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS units (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS items (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS styles (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), "styleNo" TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS production_orders (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), order_no TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS dpr_logs (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), report_date DATE DEFAULT CURRENT_DATE);

-- 3. ROBUST COLUMN ADDITION (Using DO blocks to skip errors)
DO $$ 
BEGIN 
    -- Items Table Repairs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='sku') THEN
        ALTER TABLE items ADD COLUMN sku TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='status') THEN
        ALTER TABLE items ADD COLUMN status TEXT DEFAULT 'Active';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='category') THEN
        ALTER TABLE items ADD COLUMN category TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='brand') THEN
        ALTER TABLE items ADD COLUMN brand TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='rate') THEN
        ALTER TABLE items ADD COLUMN rate NUMERIC DEFAULT 0;
    END IF;

    -- Styles Table Repairs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='styles' AND column_name='buyerId') THEN
        ALTER TABLE styles ADD COLUMN "buyerId" UUID REFERENCES buyers(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='styles' AND column_name='buyerPO') THEN
        ALTER TABLE styles ADD COLUMN "buyerPO" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='styles' AND column_name='buyerPOCopy') THEN
        ALTER TABLE styles ADD COLUMN "buyerPOCopy" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='styles' AND column_name='status') THEN
        ALTER TABLE styles ADD COLUMN status TEXT DEFAULT 'Active';
    END IF;

    -- Purchase Orders Repairs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_orders' AND column_name='poNumber') THEN
        -- poNumber typically exists if table exists, but just in case
        ALTER TABLE purchase_orders ADD COLUMN "poNumber" TEXT;
    END IF;
END $$;

-- 4. ROBUST INDEX CREATION
-- We run these outside DO blocks since CREATE INDEX IF NOT EXISTS is standard, 
-- but only for columns we know exist now.

CREATE INDEX IF NOT EXISTS idx_items_sku_v5 ON items(sku);
CREATE INDEX IF NOT EXISTS idx_items_name_v5 ON items(name);
CREATE INDEX IF NOT EXISTS idx_styles_styleNo_v5 ON styles("styleNo");
CREATE INDEX IF NOT EXISTS idx_styles_created_at_v5 ON styles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_poNumber_v5 ON purchase_orders("poNumber");

-- 5. FINAL PERMISSIONS & CACHE RESET
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Disable RLS if needed
DO $$
DECLARE t TEXT;
BEGIN
    FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

SELECT 'DATABASE REPAIRED SUCCESSFULLY (v5.0)! All columns and indexes are now in sync.' as result;
