-- ============================================================
-- MADAN CREATION ERP - MASTER SCHEMA (Consolidated v4.0)
-- Optimized | camelCase (App Compatible) | Idempotent
-- ============================================================

-- 1. EXTENSIONS & SETUP
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. MASTER DATA TABLES
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL UNIQUE,
    contact_person TEXT, mobile TEXT, email TEXT, phone TEXT, gstin TEXT, pan TEXT, address TEXT
);

CREATE TABLE IF NOT EXISTS buyers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL UNIQUE,
    email TEXT, contact_no TEXT, address TEXT,
    status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL, description TEXT,
    status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL, address TEXT, contact_no TEXT
);

CREATE TABLE IF NOT EXISTS garments_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL, description TEXT,
    status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    "fabricCode" TEXT, "hsnCode" TEXT, description TEXT, "materialType" TEXT, "openingStock" NUMERIC,
    "fabricType" TEXT, "fabricWidth" TEXT, color TEXT, "fabricDesign" TEXT, unit TEXT, rate NUMERIC, "rateType" TEXT, image TEXT,
    sku TEXT UNIQUE, category TEXT, brand TEXT, status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    worker_code TEXT UNIQUE, name TEXT NOT NULL,
    designation TEXT, skill_level TEXT, mobile TEXT, email TEXT,
    face_descriptor JSONB, status TEXT DEFAULT 'Active'
);

-- 3. PRODUCT & STYLE MANAGEMENT
CREATE TABLE IF NOT EXISTS styles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    "styleNo" TEXT NOT NULL,
    "buyerId" UUID REFERENCES buyers(id) ON DELETE SET NULL,
    "buyerPO" TEXT, 
    "buyerPOCopy" TEXT,
    image TEXT, 
    "buyerName" TEXT, 
    "fabricName" TEXT, 
    "fabricContent" TEXT,
    "fabricWidth" TEXT, 
    color TEXT, 
    season TEXT, 
    description TEXT, 
    notes TEXT,
    "buyerPOReceivedDate" DATE,
    "poExpiredDate" DATE, 
    category TEXT, 
    section TEXT, 
    "orderType" TEXT, 
    "leadTime" INTEGER,
    "poExtensionDate" DATE, 
    "stitchingRate" NUMERIC, 
    "perPcsAvg" NUMERIC, 
    status TEXT DEFAULT 'Active',
    "sizeWiseDetails" JSONB DEFAULT '[]'::jsonb,
    "bomDetails" JSONB DEFAULT '[]'::jsonb,
    "operationsDetails" JSONB DEFAULT '[]'::jsonb,
    "pcsPerSet" INTEGER DEFAULT 1,
    "setDetails" JSONB DEFAULT '[]'::jsonb
);

-- 4. PURCHASE & CHALLAN FLOW
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    "poNumber" TEXT NOT NULL UNIQUE,
    date DATE,
    "supplierId" UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    "supplierName" TEXT,
    "billingAddress" TEXT,
    "deliveryAddress" TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    commercials JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'Draft'
);

CREATE TABLE IF NOT EXISTS challans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    "grnNo" TEXT NOT NULL UNIQUE,
    date DATE,
    "supplierId" UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    "poId" UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    items JSONB DEFAULT '[]'::jsonb,
    remarks TEXT,
    "challanImage" TEXT, "productImage" TEXT, "challanNo" TEXT, "vehicleNo" TEXT,
    status TEXT DEFAULT 'Pending'
);

CREATE TABLE IF NOT EXISTS outward_challans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    "outChallanNo" TEXT NOT NULL UNIQUE,
    date DATE,
    "supplierId" UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    items JSONB DEFAULT '[]'::jsonb,
    purpose TEXT, vehicle_no TEXT, remarks TEXT, "referenceNo" TEXT, "vehicleNo" TEXT,
    status TEXT DEFAULT 'Pending'
);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    "invoiceNo" TEXT,
    date DATE,
    "supplierId" UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    items JSONB,
    "subTotal" NUMERIC, "taxAmount" NUMERIC, "grandTotal" NUMERIC,
    status TEXT DEFAULT 'Draft'
);

-- 5. PRODUCTION MODULE
CREATE TABLE IF NOT EXISTS production_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    name TEXT NOT NULL, 
    category TEXT, 
    capacity_per_day INTEGER, 
    status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS production_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    order_no TEXT NOT NULL UNIQUE,
    style_id UUID REFERENCES styles(id) ON DELETE SET NULL,
    buyer_id UUID REFERENCES buyers(id) ON DELETE SET NULL,
    season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
    order_date DATE DEFAULT CURRENT_DATE,
    delivery_date DATE,
    quantity_breakdown JSONB,
    total_qty INTEGER,
    status TEXT DEFAULT 'Planned',
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS cutting_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    order_id UUID REFERENCES production_orders(id) ON DELETE CASCADE,
    cutting_no TEXT NOT NULL UNIQUE,
    fabric_issued_qty NUMERIC,
    marker_length NUMERIC,
    lay_count INTEGER,
    total_cut_qty INTEGER,
    wastage_percentage NUMERIC,
    cutting_type TEXT DEFAULT '1 Pcs',
    component_details JSONB DEFAULT '[]'::jsonb,
    total_fabric_received NUMERIC DEFAULT 0,
    total_fabric_used NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Pending'
);

CREATE TABLE IF NOT EXISTS bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    cutting_order_id UUID REFERENCES cutting_orders(id) ON DELETE CASCADE,
    bundle_no TEXT NOT NULL,
    size TEXT,
    color TEXT,
    qty_per_bundle INTEGER,
    barcode TEXT UNIQUE,
    component_name TEXT,
    status TEXT DEFAULT 'Cut'
);

-- 6. QC, STITCHING & FINISHING
CREATE TABLE IF NOT EXISTS stitching_receives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    worker_id UUID REFERENCES workers(id),
    production_order_id UUID REFERENCES production_orders(id),
    receive_date DATE DEFAULT CURRENT_DATE,
    receipt_no TEXT UNIQUE,
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS stitching_receive_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    receive_id UUID REFERENCES stitching_receives(id) ON DELETE CASCADE,
    size TEXT, color TEXT, quantity INTEGER
);

CREATE TABLE IF NOT EXISTS garment_barcodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    receive_item_id UUID REFERENCES stitching_receive_items(id) ON DELETE CASCADE,
    production_order_id UUID REFERENCES production_orders(id),
    barcode TEXT UNIQUE, size TEXT, color TEXT, status TEXT DEFAULT 'Stitched'
);

CREATE TABLE IF NOT EXISTS qc_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    bundle_id UUID REFERENCES bundles(id) ON DELETE SET NULL,
    inspection_type TEXT,
    passed_qty INTEGER DEFAULT 0,
    failed_qty INTEGER DEFAULT 0,
    defects JSONB DEFAULT '[]'::jsonb,
    inspector_id UUID REFERENCES workers(id) ON DELETE SET NULL,
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS cartons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    carton_no TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'Open',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carton_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    carton_id UUID REFERENCES cartons(id) ON DELETE CASCADE,
    bundle_id UUID UNIQUE REFERENCES bundles(id) ON DELETE SET NULL
);

-- 7. LOGISTICS & ISSUES
CREATE TABLE IF NOT EXISTS material_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    issue_no TEXT NOT NULL UNIQUE,
    worker_id UUID REFERENCES workers(id),
    production_order_id UUID REFERENCES production_orders(id),
    issue_date DATE DEFAULT CURRENT_DATE,
    remarks TEXT,
    status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS material_issue_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    material_issue_id UUID REFERENCES material_issues(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id),
    qty NUMERIC NOT NULL,
    unit TEXT
);

CREATE TABLE IF NOT EXISTS fabric_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_no TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'Pending',
    remarks TEXT,
    "styleNo" TEXT,
    "buyerPO" TEXT
);

CREATE TABLE IF NOT EXISTS fabric_issue_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    fabric_issue_id UUID REFERENCES fabric_issues(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id),
    item_name TEXT,
    quantity NUMERIC NOT NULL,
    unit TEXT DEFAULT 'Mtrs',
    roll_no TEXT
);

CREATE TABLE IF NOT EXISTS costings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    style_id UUID REFERENCES styles(id) ON DELETE CASCADE,
    total_cost NUMERIC DEFAULT 0
);

-- 8. HR & REPORTING
CREATE TABLE IF NOT EXISTS hr_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    emp_id TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    department TEXT, designation TEXT, salary_type TEXT,
    base_salary NUMERIC NOT NULL DEFAULT 0,
    mobile TEXT, email TEXT, joining_date DATE,
    face_descriptor JSONB, status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS hr_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    employee_id UUID REFERENCES hr_employees(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE, check_in TIMESTAMPTZ, check_out TIMESTAMPTZ,
    status TEXT DEFAULT 'Present', UNIQUE (employee_id, date)
);

CREATE TABLE IF NOT EXISTS hr_salaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    employee_id UUID REFERENCES hr_employees(id) ON DELETE CASCADE,
    month INTEGER NOT NULL, year INTEGER NOT NULL,
    present_days NUMERIC DEFAULT 0, absent_days NUMERIC DEFAULT 0, half_days NUMERIC DEFAULT 0,
    total_salary NUMERIC DEFAULT 0, status TEXT DEFAULT 'Draft', approved_at TIMESTAMPTZ,
    UNIQUE (employee_id, month, year)
);

CREATE TABLE IF NOT EXISTS dpr_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    order_no TEXT,
    style_id UUID REFERENCES styles(id) ON DELETE SET NULL,
    buyer_id UUID REFERENCES buyers(id) ON DELETE SET NULL,
    production_stage TEXT,
    line_id UUID REFERENCES production_lines(id) ON DELETE SET NULL,
    responsible_staff TEXT,
    machine_group TEXT,
    bundle_start TEXT,
    planned_target INTEGER,
    actual_produced INTEGER,
    defects_count INTEGER DEFAULT 0,
    efficiency NUMERIC,
    report_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'Posted'
);

-- 9. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_styles_styleNo ON styles("styleNo");
CREATE INDEX IF NOT EXISTS idx_styles_created_at ON styles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_poNumber ON purchase_orders("poNumber");
CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_production_orders_no ON production_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_dpr_logs_date ON dpr_logs(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_bundles_barcode ON bundles(barcode);

-- 10. SECURITY (Disable RLS for ease of use as requested)
DO $$
DECLARE t TEXT;
BEGIN
    FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- 11. PERMISSIONS
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 12. POKE CACHE
NOTIFY pgrst, 'reload schema';

SELECT 'MADAN CREATION ERP MASTER SCHEMA SUCCESSFULLY CONSOLIDATED' as result;
