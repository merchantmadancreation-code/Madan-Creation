import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, CheckCircle, AlertTriangle, Database, Copy, ExternalLink, X, RefreshCw, PenTool } from 'lucide-react';
import clsx from 'clsx';

const MigrationTool = ({ forceShowSetup = false, onClose, isModal = false }) => {
    const [status, setStatus] = useState('idle'); // idle, migrating, success, error, setup
    const [msg, setMsg] = useState('');
    const [showSetup, setShowSetup] = useState(false);
    const [activeTab, setActiveTab] = useState('sync'); // sync, repair

    useEffect(() => {
        if (forceShowSetup) {
            setShowSetup(true);
            setActiveTab('repair');
        }
    }, [forceShowSetup]);

    const sqlScript = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Master Tables (Initial Setup)
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL UNIQUE,
    "contactPerson" TEXT, mobile TEXT, email TEXT, phone TEXT, gstin TEXT, pan TEXT, address TEXT
);

CREATE TABLE IF NOT EXISTS buyers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL UNIQUE,
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

-- 2. Product & Style Management
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    "fabricCode" TEXT, "hsnCode" TEXT, description TEXT, "materialType" TEXT, "openingStock" NUMERIC,
    "fabricType" TEXT, "fabricWidth" TEXT, color TEXT, "fabricDesign" TEXT, unit TEXT, rate NUMERIC, "rateType" TEXT, image TEXT,
    sku TEXT UNIQUE, category TEXT, brand TEXT, status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS styles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "styleNo" TEXT NOT NULL, "buyerPO" TEXT, image TEXT, "buyerName" TEXT, "fabricName" TEXT, "fabricContent" TEXT,
    "fabricWidth" TEXT, color TEXT, season TEXT, description TEXT, notes TEXT, "buyerPOReceivedDate" DATE,
    "poExpiredDate" DATE, "category" TEXT, "section" TEXT, "orderType" TEXT, "leadTime" INTEGER,
    "poExtensionDate" DATE, "stitchingRate" NUMERIC, "perPcsAvg" NUMERIC, status TEXT DEFAULT 'Active',
    "sizeWiseDetails" JSONB DEFAULT '[]'::jsonb,
    "buyerPOCopy" TEXT,
    "bomDetails" JSONB DEFAULT '[]'::jsonb,
    "operationsDetails" JSONB DEFAULT '[]'::jsonb,
    "buyerId" UUID REFERENCES buyers(id)
);

-- 3. Production Resource Management
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

-- 4. Production Workflow
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
    status TEXT DEFAULT 'Pending'
);

CREATE TABLE IF NOT EXISTS bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cutting_order_id UUID REFERENCES cutting_orders(id),
    bundle_no TEXT NOT NULL, size TEXT, color TEXT, qty_per_bundle INTEGER,
    barcode TEXT UNIQUE, component_name TEXT, status TEXT DEFAULT 'Cut'
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

CREATE TABLE IF NOT EXISTS outward_challans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "outChallanNo" TEXT UNIQUE NOT NULL,
    date DATE NOT NULL,
    "supplierId" UUID REFERENCES suppliers(id),
    purpose TEXT,
    "referenceNo" TEXT,
    "vehicleNo" TEXT,
    remarks TEXT,
    items JSONB DEFAULT '[]'::jsonb
);

-- 5. Robust Update RPC
CREATE OR REPLACE FUNCTION update_style_status(style_id UUID, new_status TEXT)
RETURNS VOID SECURITY DEFINER AS $$
BEGIN
    UPDATE styles SET status = new_status WHERE id = style_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION update_style_status(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION update_style_status(UUID, TEXT) TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Disable RLS for all critical tables
ALTER TABLE production_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE cutting_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE bundles DISABLE ROW LEVEL SECURITY;

-- Stitching Issue Tables
CREATE TABLE IF NOT EXISTS stitching_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    issue_no TEXT NOT NULL UNIQUE,
    production_order_id UUID REFERENCES production_orders(id),
    worker_id UUID REFERENCES workers(id),
    issue_date DATE DEFAULT CURRENT_DATE,
    remarks TEXT,
    status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS stitching_issue_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    stitching_issue_id UUID REFERENCES stitching_issues(id) ON DELETE CASCADE,
    bundle_id UUID REFERENCES bundles(id),
    qty INTEGER NOT NULL
);

-- Worker Production Receiving
CREATE TABLE IF NOT EXISTS stitching_receives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    worker_id UUID REFERENCES workers(id),
    production_order_id UUID REFERENCES production_orders(id),
    receive_date DATE DEFAULT CURRENT_DATE,
    receipt_no TEXT UNIQUE,
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS stitching_receive_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    receive_id UUID REFERENCES stitching_receives(id) ON DELETE CASCADE,
    size TEXT,
    color TEXT,
    quantity INTEGER
);

CREATE TABLE IF NOT EXISTS garment_barcodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    receive_item_id UUID REFERENCES stitching_receive_items(id) ON DELETE CASCADE,
    production_order_id UUID REFERENCES production_orders(id),
    barcode TEXT UNIQUE,
    size TEXT,
    color TEXT,
    status TEXT DEFAULT 'Stitched'
);

ALTER TABLE stitching_issues DISABLE ROW LEVEL SECURITY;
ALTER TABLE stitching_issue_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE stitching_receives DISABLE ROW LEVEL SECURITY;
ALTER TABLE stitching_receive_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE garment_barcodes DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- Finishing & Dispatch Module
CREATE TABLE IF NOT EXISTS finishing_receives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    worker_id UUID REFERENCES workers(id),
    production_order_id UUID REFERENCES production_orders(id),
    receive_date DATE DEFAULT CURRENT_DATE,
    receipt_no TEXT UNIQUE,
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS finishing_receive_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    receive_id UUID REFERENCES finishing_receives(id) ON DELETE CASCADE,
    size TEXT,
    quantity INTEGER
);

CREATE TABLE IF NOT EXISTS dispatch_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    buyer_id UUID REFERENCES buyers(id),
    production_order_id UUID REFERENCES production_orders(id),
    dispatch_date DATE DEFAULT CURRENT_DATE,
    invoice_no TEXT UNIQUE,
    vehicle_no TEXT,
    total_qty INTEGER,
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS dispatch_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    dispatch_id UUID REFERENCES dispatch_registers(id) ON DELETE CASCADE,
    size TEXT,
    quantity INTEGER
);

ALTER TABLE finishing_receives DISABLE ROW LEVEL SECURITY;
ALTER TABLE finishing_receive_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_registers DISABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_items DISABLE ROW LEVEL SECURITY;

GRANT ALL ON finishing_receives, finishing_receive_items, dispatch_registers, dispatch_items TO anon, authenticated, service_role;

-- HR Management Module
CREATE TABLE IF NOT EXISTS hr_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    emp_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department TEXT,
    designation TEXT,
    salary_type TEXT CHECK (salary_type IN ('Monthly', 'Daily')),
    base_salary NUMERIC NOT NULL DEFAULT 0,
    mobile TEXT, email TEXT, joining_date DATE,
    face_descriptor JSONB, status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS hr_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    employee_id UUID REFERENCES hr_employees(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    check_in TIMESTAMP WITH TIME ZONE, check_out TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'Present',
    UNIQUE (employee_id, date)
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

ALTER TABLE hr_employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE hr_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE hr_salaries DISABLE ROW LEVEL SECURITY;

GRANT ALL ON hr_employees, hr_attendance, hr_salaries TO anon, authenticated;

-- Force Cache Reload
NOTIFY pgrst, 'reload schema';

-- 6. Force Cache Reload
NOTIFY pgrst, 'reload schema';
`;

    const repairSql = `
-- NUCLEAR REPAIR SCRIPT (RESILIENT VERSION)
-- Use this if you see "Table not found in schema cache"

-- 1. Ensure Table Structure exists
CREATE TABLE IF NOT EXISTS buyers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL UNIQUE,
    email TEXT,
    contact_no TEXT,
    address TEXT,
    status TEXT DEFAULT 'Active'
);

-- 2. DISABLE RLS (Critical for immediate visibility)
ALTER TABLE buyers DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE styles DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE challans DISABLE ROW LEVEL SECURITY;
ALTER TABLE outward_challans DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE items DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE outward_challans DISABLE ROW LEVEL SECURITY;

-- 3. FORCE API REDISCOVERY (The Rename Trick - Aggressive)
DO $$ 
BEGIN 
    -- Buyers
    ALTER TABLE IF EXISTS buyers RENAME TO buyers_temp;
    ALTER TABLE IF EXISTS buyers_temp RENAME TO buyers;
    
    -- Cutting Orders (Fixing the 'component_details' error)
    ALTER TABLE IF EXISTS cutting_orders RENAME TO cutting_orders_temp;
    ALTER TABLE IF EXISTS cutting_orders_temp RENAME TO cutting_orders;
    
    -- Bundles
    ALTER TABLE IF EXISTS bundles RENAME TO bundles_temp;
    ALTER TABLE IF EXISTS bundles_temp RENAME TO bundles;
EXCEPTION WHEN OTHERS THEN 
    -- Ignore if rename logic fails
END $$;

-- 4. GRANT FULL PERMISSIONS
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 5. POKE API CACHE
ALTER TABLE cutting_orders ADD COLUMN IF NOT EXISTS cutting_type TEXT DEFAULT '1 Pcs';
ALTER TABLE cutting_orders ADD COLUMN IF NOT EXISTS component_details JSONB DEFAULT '[]'::jsonb;
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS component_name TEXT;
ALTER TABLE styles ADD COLUMN IF NOT EXISTS "buyerPOCopy" TEXT;

-- 6. FORCE SCHEMA RELOAD
NOTIFY pgrst, 'reload schema';

-- Production Receiving Repair
CREATE TABLE IF NOT EXISTS stitching_receives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    worker_id UUID REFERENCES workers(id),
    production_order_id UUID REFERENCES production_orders(id),
    receive_date DATE DEFAULT CURRENT_DATE,
    receipt_no TEXT UNIQUE,
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS stitching_receive_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    receive_id UUID REFERENCES stitching_receives(id) ON DELETE CASCADE,
    size TEXT,
    color TEXT,
    quantity INTEGER
);

CREATE TABLE IF NOT EXISTS garment_barcodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    receive_item_id UUID REFERENCES stitching_receive_items(id) ON DELETE CASCADE,
    production_order_id UUID REFERENCES production_orders(id),
    barcode TEXT UNIQUE,
    size TEXT,
    color TEXT,
    status TEXT DEFAULT 'Stitched'
);

ALTER TABLE stitching_receives DISABLE ROW LEVEL SECURITY;
ALTER TABLE stitching_receive_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE garment_barcodes DISABLE ROW LEVEL SECURITY;

GRANT ALL ON stitching_receives, stitching_receive_items, garment_barcodes TO anon, authenticated, service_role;

-- HR Management Repair
CREATE TABLE IF NOT EXISTS hr_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    emp_id TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    department TEXT, designation TEXT, salary_type TEXT,
    base_salary NUMERIC NOT NULL DEFAULT 0,
    mobile TEXT, email TEXT, joining_date DATE,
    face_descriptor JSONB, status TEXT DEFAULT 'Active'
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
    present_days NUMERIC DEFAULT 0, total_salary NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Draft', UNIQUE (employee_id, month, year)
);

ALTER TABLE hr_employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE hr_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE hr_salaries DISABLE ROW LEVEL SECURITY;

ALTER TABLE hr_salaries ADD COLUMN IF NOT EXISTS absent_days NUMERIC DEFAULT 0;
ALTER TABLE hr_salaries ADD COLUMN IF NOT EXISTS half_days NUMERIC DEFAULT 0;
ALTER TABLE hr_salaries ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Outward Challans Repair
ALTER TABLE outward_challans ADD COLUMN IF NOT EXISTS "referenceNo" TEXT;
ALTER TABLE outward_challans ADD COLUMN IF NOT EXISTS "vehicleNo" TEXT;
GRANT ALL ON outward_challans TO anon, authenticated, service_role;

-- Finishing Repair
CREATE TABLE IF NOT EXISTS finishing_receives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    worker_id UUID REFERENCES workers(id),
    production_order_id UUID REFERENCES production_orders(id),
    receive_date DATE DEFAULT CURRENT_DATE,
    receipt_no TEXT UNIQUE,
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS finishing_receive_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    receive_id UUID REFERENCES finishing_receives(id) ON DELETE CASCADE,
    size TEXT,
    quantity INTEGER
);

CREATE TABLE IF NOT EXISTS dispatch_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    buyer_id UUID REFERENCES buyers(id),
    production_order_id UUID REFERENCES production_orders(id),
    dispatch_date DATE DEFAULT CURRENT_DATE,
    invoice_no TEXT UNIQUE,
    vehicle_no TEXT,
    total_qty INTEGER,
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS dispatch_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    dispatch_id UUID REFERENCES dispatch_registers(id) ON DELETE CASCADE,
    size TEXT,
    quantity INTEGER
);

ALTER TABLE finishing_receives DISABLE ROW LEVEL SECURITY;
ALTER TABLE finishing_receive_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_registers DISABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_items DISABLE ROW LEVEL SECURITY;

ALTER TABLE dispatch_registers ADD COLUMN IF NOT EXISTS rate NUMERIC DEFAULT 0;
ALTER TABLE dispatch_registers ADD COLUMN IF NOT EXISTS gst_rate NUMERIC DEFAULT 5;

-- Allow QC and Cartons to use Finishing Items instead of Bundles
ALTER TABLE qc_inspections ALTER COLUMN bundle_id DROP NOT NULL;
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS finishing_receipt_item_id UUID REFERENCES finishing_receive_items(id) ON DELETE CASCADE;
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS remarks TEXT;

ALTER TABLE carton_items ALTER COLUMN bundle_id DROP NOT NULL;
ALTER TABLE carton_items ADD COLUMN IF NOT EXISTS finishing_receipt_item_id UUID REFERENCES finishing_receive_items(id) ON DELETE CASCADE;

GRANT ALL ON finishing_receives, finishing_receive_items, dispatch_registers, dispatch_items TO anon, authenticated, service_role;

GRANT ALL ON hr_employees, hr_attendance, hr_salaries TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

SELECT 'Database successfully repaired! Please refresh your browser.' as Status;
`;

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('SQL copied to clipboard!');
    };

    const migrateData = async () => {
        if (!confirm('This will upload your local data to Supabase. Continue?')) return;

        setStatus('migrating');
        setMsg('Reading local storage...');

        try {
            const suppliers = JSON.parse(localStorage.getItem('suppliers') || '[]');
            const items = JSON.parse(localStorage.getItem('items') || '[]');
            const styles = JSON.parse(localStorage.getItem('styles') || '[]');

            const clean = (data) => data.map(({ id, ...rest }) => rest);

            if (suppliers.length) await supabase.from('suppliers').upsert(clean(suppliers), { onConflict: 'name' });
            if (items.length) await supabase.from('items').upsert(clean(items), { onConflict: 'sku' });
            if (styles.length) await supabase.from('styles').upsert(clean(styles), { onConflict: 'styleNo' });

            setStatus('success');
            setMsg('Data synchronized successfully!');
        } catch (err) {
            console.error('Migration error:', err);
            setStatus('error');
            setMsg(err.message);
        }
    };

    // Removed return null that caused empty overlay "hangs"

    return (
        <div className={clsx(
            "flex items-center justify-center overflow-hidden",
            !isModal && "fixed inset-0 z-50 p-4 bg-sage-900/50 backdrop-blur-sm"
        )}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-sage-200 animate-in fade-in zoom-in duration-200">
                <div className="p-6 bg-sage-50 border-b border-sage-200 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-sage-600 rounded-lg text-white">
                            <Database size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-sage-800">Supabase Cloud Manager</h2>
                            <p className="text-sage-500 text-sm">Maintain your cloud database and connection</p>
                        </div>
                    </div>
                    <button onClick={() => { if (onClose) onClose(); setShowSetup(false); }} className="text-sage-400 hover:text-sage-600 p-1 hover:bg-sage-100 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex border-b border-sage-100">
                    <button
                        onClick={() => setActiveTab('sync')}
                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'sync' ? 'text-sage-700 border-b-2 border-sage-600 bg-white' : 'text-sage-400 hover:text-sage-50 bg-sage-50/50'}`}
                    >
                        <RefreshCw size={16} /> Sync Local Data
                    </button>
                    <button
                        onClick={() => setActiveTab('repair')}
                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'repair' ? 'text-red-700 border-b-2 border-red-600 bg-white' : 'text-sage-400 hover:text-red-500 bg-sage-50/50'}`}
                    >
                        <PenTool size={16} /> Repair Schema Errors
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {activeTab === 'sync' ? (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-sage-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <span className="w-5 h-5 rounded-full bg-sage-100 text-sage-600 flex items-center justify-center text-[10px] font-bold">1</span>
                                    Initial Setup
                                </h3>
                                <div className="p-4 bg-sage-50 rounded-xl border border-sage-200 space-y-3">
                                    <p className="text-xs text-sage-600 leading-relaxed">
                                        Copy and run this SQL in your **Supabase Dashboard** to prepare the database structure.
                                    </p>
                                    <div className="flex gap-2">
                                        <button onClick={() => copyToClipboard(sqlScript)} className="flex-1 py-2 bg-white border border-sage-300 rounded-lg text-sage-700 hover:bg-sage-50 flex items-center justify-center gap-2 transition-colors text-xs font-bold shadow-sm">
                                            <Copy size={14} /> Copy Setup SQL
                                        </button>
                                        <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="flex-1 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700 flex items-center justify-center gap-2 transition-colors text-xs font-bold shadow-sm">
                                            <ExternalLink size={14} /> Open Dashboard
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-sage-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <span className="w-5 h-5 rounded-full bg-sage-100 text-sage-600 flex items-center justify-center text-[10px] font-bold">2</span>
                                    Upload Data
                                </h3>
                                {status === 'idle' && (
                                    <button onClick={migrateData} className="w-full py-4 bg-sage-800 text-white rounded-xl shadow-lg hover:bg-sage-900 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] font-bold">
                                        <Upload size={20} /> Start Synchronization
                                    </button>
                                )}
                                {status === 'migrating' && (
                                    <div className="p-6 bg-sage-50 rounded-xl border border-sage-200 text-center space-y-3">
                                        <div className="animate-spin text-sage-600 flex justify-center"><Database size={32} /></div>
                                        <p className="text-sage-700 font-medium">{msg} Uploading records...</p>
                                    </div>
                                )}
                                {status === 'success' && (
                                    <div className="p-6 bg-green-50 rounded-xl border border-green-200 text-center space-y-3 animate-in fade-in zoom-in duration-300">
                                        <div className="text-green-600 flex justify-center"><CheckCircle size={48} /></div>
                                        <h4 className="text-green-800 font-bold text-lg">Sync Complete!</h4>
                                        <p className="text-green-700 text-sm">{msg}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-start gap-4 p-4 bg-red-50 border border-red-100 rounded-xl">
                                <AlertTriangle className="text-red-500 shrink-0 mt-1" size={24} />
                                <div className="space-y-1">
                                    <h4 className="font-bold text-red-800 text-sm italic">STALE SCHEMA CACHE DETECTED</h4>
                                    <p className="text-xs text-red-700 leading-relaxed">
                                        Your Supabase API is "stuck" in an old version. Run the script below to force a structural reload.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-sage-700 flex items-center gap-2 text-sm uppercase tracking-wider">The "Nuclear" Repair Script</h3>
                                <div className="p-5 bg-white rounded-xl border-2 border-dashed border-red-200 space-y-4">
                                    <p className="text-xs text-sage-600 italic leading-relaxed">
                                        This script renames the column back and forth to force Supabase to rediscover it.
                                    </p>
                                    <button
                                        onClick={() => copyToClipboard(repairSql)}
                                        className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 transition-all font-bold shadow-md"
                                    >
                                        <Copy size={16} /> Copy Repair SQL
                                    </button>
                                </div>

                                <div className="space-y-2 pt-4 border-t border-sage-200">
                                    <h4 className="font-bold text-sage-700 text-xs uppercase tracking-wider">Missing Columns Fix</h4>
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                                        <p className="text-xs text-blue-800">
                                            Run these for specific missing column errors:
                                        </p>
                                        <button
                                            onClick={() => copyToClipboard(`ALTER TABLE bundles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`)}
                                            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-xs font-bold"
                                        >
                                            <Copy size={14} /> Copy "Add Column" SQL
                                        </button>
                                        <button
                                            onClick={() => copyToClipboard(`ALTER TABLE styles ADD COLUMN IF NOT EXISTS "buyerPOCopy" TEXT; NOTIFY pgrst, 'reload schema';`)}
                                            className="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center justify-center gap-2 text-xs font-bold"
                                        >
                                            <Copy size={14} /> Copy "Styles Fix" SQL
                                        </button>
                                        <button
                                            onClick={() => copyToClipboard(`ALTER TABLE outward_challans ADD COLUMN IF NOT EXISTS "referenceNo" TEXT; ALTER TABLE outward_challans ADD COLUMN IF NOT EXISTS "vehicleNo" TEXT; NOTIFY pgrst, 'reload schema';`)}
                                            className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 text-xs font-bold"
                                        >
                                            <Copy size={14} /> Copy "Outward Fix" SQL
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-cream border-t border-sage-100 text-[10px] text-sage-400 text-center uppercase tracking-widest font-bold">
                    Madan Creation • Database Management System v3.0
                </div>
            </div >
        </div >
    );
};

export default MigrationTool;
