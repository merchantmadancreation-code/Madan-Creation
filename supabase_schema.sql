-- EXPLICIT CLEANUP & CONSOLIDATION SCRIPT
-- Madan Creation ERP - Perfect Schema v2.0
-- This script is idempotent (safe to run multiple times)

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. MASTER DATA TABLES
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    "contactPerson" TEXT, mobile TEXT, email TEXT, phone TEXT, gstin TEXT, pan TEXT, address TEXT
);

CREATE TABLE IF NOT EXISTS buyers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    email TEXT, contact_no TEXT, address TEXT,
    status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL, description TEXT,
    status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS garment_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL, description TEXT,
    status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL, address TEXT, contact_no TEXT
);

CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    "fabricCode" TEXT, "hsnCode" TEXT, description TEXT, "materialType" TEXT, "openingStock" NUMERIC,
    "fabricType" TEXT, "fabricWidth" TEXT, color TEXT, "fabricDesign" TEXT, unit TEXT, rate NUMERIC, "rateType" TEXT, image TEXT,
    sku TEXT UNIQUE, category TEXT, brand TEXT, status TEXT DEFAULT 'Active'
);

-- 3. PRODUCT & STYLE MANAGEMENT
CREATE TABLE IF NOT EXISTS styles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "styleNo" TEXT NOT NULL, "buyerPO" TEXT, image TEXT, "buyerName" TEXT, "fabricName" TEXT, "fabricContent" TEXT,
    "fabricWidth" TEXT, color TEXT, season TEXT, description TEXT, notes TEXT, "buyerPOReceivedDate" DATE,
    "poExpiredDate" DATE, "category" TEXT, "section" TEXT, "orderType" TEXT, "leadTime" INTEGER,
    "poExtensionDate" DATE, "stitchingRate" NUMERIC, "perPcsAvg" NUMERIC, status TEXT DEFAULT 'Active',
    "sizeWiseDetails" JSONB DEFAULT '[]'::jsonb,
    "bomDetails" JSONB DEFAULT '[]'::jsonb,
    "operationsDetails" JSONB DEFAULT '[]'::jsonb,
    "buyerId" UUID REFERENCES buyers(id),
    "buyerPOCopy" TEXT
);

-- 4. PURCHASE & CHALLAN FLOW
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "poNumber" TEXT NOT NULL UNIQUE,
    date DATE,
    "supplierId" UUID REFERENCES suppliers(id),
    "supplierName" TEXT,
    "billingAddress" TEXT,
    "deliveryAddress" TEXT,
    items JSONB,
    commercials JSONB,
    status TEXT DEFAULT 'Draft'
);

CREATE TABLE IF NOT EXISTS challans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "grnNo" TEXT NOT NULL UNIQUE,
    date DATE,
    "supplierId" UUID REFERENCES suppliers(id),
    "poId" UUID REFERENCES purchase_orders(id),
    items JSONB,
    remarks TEXT,
    "challanImage" TEXT,
    "productImage" TEXT,
    "challanNo" TEXT,
    "vehicleNo" TEXT,
    status TEXT DEFAULT 'Pending'
);

CREATE TABLE IF NOT EXISTS outward_challans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "outChallanNo" TEXT NOT NULL UNIQUE,
    date DATE,
    "supplierId" UUID REFERENCES suppliers(id),
    items JSONB,
    purpose TEXT,
    vehicle_no TEXT,
    remarks TEXT,
    "referenceNo" TEXT,
    "vehicleNo" TEXT -- Keeping consistent with inward
);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "invoiceNo" TEXT,
    date DATE,
    "supplierId" UUID REFERENCES suppliers(id),
    items JSONB,
    "subTotal" NUMERIC,
    "taxAmount" NUMERIC,
    "grandTotal" NUMERIC,
    status TEXT DEFAULT 'Draft'
);

-- 5. PRODUCTION MODULE
CREATE TABLE IF NOT EXISTS production_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unit_id UUID REFERENCES units(id),
    name TEXT NOT NULL, category TEXT, capacity_per_day INTEGER, status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS machine_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL, description TEXT
);

CREATE TABLE IF NOT EXISTS machines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unit_id UUID REFERENCES units(id),
    machine_type_id UUID REFERENCES machine_types(id),
    serial_no TEXT UNIQUE, brand TEXT, model_no TEXT, status TEXT DEFAULT 'Available'
);

CREATE TABLE IF NOT EXISTS workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unit_id UUID REFERENCES units(id),
    worker_code TEXT UNIQUE, name TEXT NOT NULL,
    designation TEXT, skill_level TEXT, mobile TEXT, status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS operations_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    category_id UUID REFERENCES garment_categories(id),
    operation_name TEXT NOT NULL, machine_type_id UUID REFERENCES machine_types(id),
    standard_smv NUMERIC NOT NULL DEFAULT 0, cost_per_operation NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS production_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    order_no TEXT NOT NULL UNIQUE, style_id UUID REFERENCES styles(id),
    buyer_id UUID REFERENCES buyers(id), season_id UUID REFERENCES seasons(id),
    order_date DATE DEFAULT CURRENT_DATE, delivery_date DATE,
    quantity_breakdown JSONB, total_qty INTEGER,
    status TEXT DEFAULT 'Planned', remarks TEXT
);

CREATE TABLE IF NOT EXISTS production_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    order_id UUID REFERENCES production_orders(id),
    line_id UUID REFERENCES production_lines(id),
    start_date DATE, end_date DATE,
    target_per_day INTEGER, planned_efficiency NUMERIC DEFAULT 100, status TEXT DEFAULT 'Scheduled'
);

CREATE TABLE IF NOT EXISTS cutting_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    order_id UUID REFERENCES production_orders(id),
    cutting_no TEXT NOT NULL UNIQUE, fabric_issued_qty NUMERIC,
    marker_length NUMERIC, lay_count INTEGER, total_cut_qty INTEGER,
    wastage_percentage NUMERIC, 
    cutting_type TEXT DEFAULT '1 Pcs',
    component_details JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'Pending',
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cutting_order_id UUID REFERENCES cutting_orders(id),
    bundle_no TEXT NOT NULL, size TEXT, color TEXT, qty_per_bundle INTEGER,
    barcode TEXT UNIQUE, component_name TEXT, status TEXT DEFAULT 'Cut',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hourly_production (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    plan_id UUID REFERENCES production_plans(id),
    production_date DATE DEFAULT CURRENT_DATE,
    hour_interval INTEGER, quantity INTEGER, manpower INTEGER,
    rejected_qty INTEGER DEFAULT 0, alteration_qty INTEGER DEFAULT 0, remarks TEXT
);

CREATE TABLE IF NOT EXISTS qc_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    bundle_id UUID REFERENCES bundles(id),
    inspection_type TEXT, passed_qty INTEGER, failed_qty INTEGER,
    defects JSONB, inspector_id UUID REFERENCES workers(id)
);

CREATE TABLE IF NOT EXISTS packing_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    order_id UUID REFERENCES production_orders(id),
    packing_no TEXT NOT NULL UNIQUE, box_count INTEGER, total_packed_qty INTEGER,
    shipment_date DATE, status TEXT DEFAULT 'Draft'
);

-- 6. TNA MODULE
CREATE TABLE IF NOT EXISTS tna_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL, description TEXT, status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS tna_template_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    template_id UUID REFERENCES tna_templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL, duration_days INTEGER DEFAULT 1, sequence_order INTEGER,
    stage TEXT, is_milestone BOOLEAN DEFAULT FALSE,
    dependency_task_id UUID REFERENCES tna_template_tasks(id)
);

CREATE TABLE IF NOT EXISTS tna_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    order_id UUID REFERENCES production_orders(id),
    template_id UUID REFERENCES tna_templates(id),
    status TEXT DEFAULT 'Active', delivery_date DATE
);

CREATE TABLE IF NOT EXISTS tna_plan_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    plan_id UUID REFERENCES tna_plans(id) ON DELETE CASCADE,
    template_task_id UUID REFERENCES tna_template_tasks(id),
    task_name TEXT NOT NULL,
    planned_start_date DATE, planned_end_date DATE,
    actual_start_date DATE, actual_end_date DATE,
    status TEXT DEFAULT 'Pending', assigned_to UUID REFERENCES workers(id),
    stage TEXT, department TEXT, remarks TEXT
);

-- 7. STITCHING MODULE
CREATE TABLE IF NOT EXISTS stitching_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    issue_no TEXT NOT NULL UNIQUE,
    production_order_id UUID REFERENCES production_orders(id),
    worker_id UUID REFERENCES workers(id),
    issue_date DATE DEFAULT CURRENT_DATE,
    remarks TEXT, status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS stitching_issue_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    stitching_issue_id UUID REFERENCES stitching_issues(id) ON DELETE CASCADE,
    bundle_id UUID REFERENCES bundles(id),
    qty INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS stitching_receives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    worker_id UUID REFERENCES workers(id),
    production_order_id UUID REFERENCES production_orders(id),
    receive_date DATE DEFAULT CURRENT_DATE,
    receipt_no TEXT UNIQUE, remarks TEXT
);

CREATE TABLE IF NOT EXISTS stitching_receive_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    receive_id UUID REFERENCES stitching_receives(id) ON DELETE CASCADE,
    size TEXT, color TEXT, quantity INTEGER
);

CREATE TABLE IF NOT EXISTS garment_barcodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    receive_item_id UUID REFERENCES stitching_receive_items(id) ON DELETE CASCADE,
    production_order_id UUID REFERENCES production_orders(id),
    barcode TEXT UNIQUE, size TEXT, color TEXT, status TEXT DEFAULT 'Stitched'
);

-- 8. HR MODULE
CREATE TABLE IF NOT EXISTS hr_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    emp_id TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    department TEXT, designation TEXT, salary_type TEXT,
    base_salary NUMERIC NOT NULL DEFAULT 0, mobile TEXT, email TEXT,
    joining_date DATE, face_descriptor JSONB, status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS hr_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    employee_id UUID REFERENCES hr_employees(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE, check_in TIMESTAMP WITH TIME ZONE, check_out TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'Present', UNIQUE (employee_id, date)
);

CREATE TABLE IF NOT EXISTS hr_salaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    employee_id UUID REFERENCES hr_employees(id) ON DELETE CASCADE,
    month INTEGER NOT NULL, year INTEGER NOT NULL,
    present_days NUMERIC DEFAULT 0, absent_days NUMERIC DEFAULT 0, half_days NUMERIC DEFAULT 0,
    total_salary NUMERIC DEFAULT 0, status TEXT DEFAULT 'Draft', approved_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (employee_id, month, year)
);

-- 9. AUTH & RBAC (PROFILES)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT CHECK (role IN ('admin', 'manager', 'editor', 'viewer')) DEFAULT 'viewer',
    status TEXT DEFAULT 'Active'
);

-- 10. FUNCTIONS & TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    is_first_user BOOLEAN;
BEGIN
    -- Check if this is the first user in the profiles table
    SELECT (COUNT(*) = 0) INTO is_first_user FROM public.profiles;

    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id, 
        new.email, 
        new.raw_user_meta_data->>'full_name', 
        CASE WHEN is_first_user THEN 'admin' ELSE 'viewer' END
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safe trigger creation
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

CREATE OR REPLACE FUNCTION update_style_status(style_id UUID, new_status TEXT)
RETURNS VOID SECURITY DEFINER AS $$
BEGIN
    UPDATE styles SET status = new_status WHERE id = style_id;
END;
$$ LANGUAGE plpgsql;

-- 11. SECURITY & PERMISSIONS
-- Disable RLS for all for easier development, except profiles
DO $$ 
DECLARE 
    t TEXT;
BEGIN
    FOR t IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name != 'profiles') LOOP
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Idempotent Policy Creation
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public profiles are viewable by everyone') THEN
        CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
    END IF;

    -- Allow users to update their own profile OR admins to update any profile
    DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all profiles, users can update own') THEN
        CREATE POLICY "Admins can update all profiles, users can update own" ON profiles 
            FOR UPDATE USING (
                auth.uid() = id OR 
                EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
            );
    END IF;

    -- Only admins can delete profiles
    DROP POLICY IF EXISTS "Only admins can delete profiles" ON profiles;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can delete profiles') THEN
        CREATE POLICY "Only admins can delete profiles" ON profiles 
            FOR DELETE USING (
                EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
            );
    END IF;
END $$;

-- Grants
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 12. NEW TABLES FOR FINISHING MODULE (Cartons & QC)
CREATE TABLE IF NOT EXISTS qc_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    bundle_id UUID REFERENCES bundles(id) ON DELETE CASCADE,
    passed_qty INTEGER DEFAULT 0,
    failed_qty INTEGER DEFAULT 0,
    inspector_id UUID REFERENCES auth.users(id),
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS cartons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    carton_no TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'Open', -- Open, Sealed, Shipped
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carton_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    carton_id UUID REFERENCES cartons(id) ON DELETE CASCADE,
    bundle_id UUID REFERENCES bundles(id) ON DELETE CASCADE,
    UNIQUE(bundle_id) -- A bundle can only be in one carton
);

GRANT ALL ON qc_inspections TO anon, authenticated, service_role;
GRANT ALL ON cartons TO anon, authenticated, service_role;
GRANT ALL ON carton_items TO anon, authenticated, service_role;

-- 13. FORCE SCHEMA RELOAD
NOTIFY pgrst, 'reload schema';

SELECT 'Madan Creation ERP Schema v2.0 successfully integrated!' as result;

-- 9. DPR MODULE
CREATE TABLE IF NOT EXISTS dpr_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    order_no TEXT,
    style_id UUID REFERENCES styles(id),
    buyer_id UUID REFERENCES buyers(id),
    production_stage TEXT,
    line_id UUID REFERENCES production_lines(id),
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

-- Enable RLS
ALTER TABLE dpr_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow all for authenticated" ON dpr_logs
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
