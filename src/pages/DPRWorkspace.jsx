import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    LayoutDashboard, Package, Users, Settings, 
    Activity, FileText, Download, Save, 
    Calendar, Search, User, Layers, Info, 
    CheckCircle, AlertCircle, Plus, Trash2, Edit2,
    RefreshCw, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';
import { useProduction } from '../context/ProductionContext';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';

const DPRWorkspace = () => {
    const { buyers = [], lines = [] } = useProduction();
    const { styles = [] } = usePurchaseOrder();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [ledger, setLedger] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        order_no: '',
        style_id: '',
        buyer_id: '',
        production_stage: 'Stitching',
        line_id: '',
        responsible_staff: '',
        machine_group: '',
        bundle_start: '',
        planned_target: 0,
        actual_produced: 0,
        defects_count: 0
    });

    const [efficiency, setEfficiency] = useState(0);
    const [filteredStyles, setFilteredStyles] = useState([]);

    // Filter styles by buyer (Robust matching by ID or Name)
    useEffect(() => {
        if (formData.buyer_id) {
            const selectedBuyer = buyers.find(b => b.id === formData.buyer_id);
            setFilteredStyles(styles.filter(s => 
                s.buyerId === formData.buyer_id || 
                (selectedBuyer && s.buyerName === selectedBuyer.name)
            ));
        } else {
            setFilteredStyles(styles);
        }
    }, [formData.buyer_id, styles, buyers]);

    // Calculate efficiency live
    useEffect(() => {
        const target = parseFloat(formData.planned_target) || 0;
        const actual = parseFloat(formData.actual_produced) || 0;
        if (target > 0) {
            setEfficiency(Math.round((actual / target) * 100));
        } else {
            setEfficiency(0);
        }
    }, [formData.planned_target, formData.actual_produced]);

    const fetchLedger = async () => {
        setLoading(true);
        try {
            // 1. Fetch Manual DPR Logs
            const { data: dprData } = await supabase
                .from('dpr_logs')
                .select('*, styles(styleNo), buyers(name)')
                .order('created_at', { ascending: false });

            // 2. Fetch Cutting Orders
            const { data: cuttingData } = await supabase
                .from('cutting_orders')
                .select('*, production_orders(order_no, styles(styleNo), buyers(name))')
                .order('created_at', { ascending: false });

            // 3. Fetch Stitching Receives
            const { data: stitchingData } = await supabase
                .from('stitching_receives')
                .select('*, production_orders(order_no, styles(styleNo), buyers(name)), stitching_receive_items(quantity)')
                .order('created_at', { ascending: false });

            // 4. Fetch QC Inspections
            const { data: qcData } = await supabase
                .from('qc_inspections')
                .select(`
                    id, created_at, passed_qty, failed_qty, remarks,
                    bundles:bundle_id (
                        cutting_order:cutting_order_id (
                            production_order:order_id (
                                order_no,
                                styles:style_id (styleNo),
                                buyers:buyer_id (name)
                            )
                        )
                    )
                `)
                .order('created_at', { ascending: false });

            // Normalization & Calculation
            const normalized = [
                ...(dprData || []).map(row => ({
                    id: row.id,
                    date: row.report_date || row.created_at,
                    order_no: row.order_no || 'N/A',
                    buyer: row.buyers?.name || 'N/A',
                    style: row.styles?.styleNo || 'N/A',
                    stage: row.production_stage,
                    planned: row.planned_target || 0,
                    actual: row.actual_produced || 0,
                    defects: row.defects_count || 0,
                    efficiency: row.efficiency || 0,
                    responsible: row.responsible_staff || 'Admin',
                    source: 'Manual'
                })),
                ...(cuttingData || []).map(row => ({
                    id: row.id,
                    date: row.created_at,
                    order_no: row.production_orders?.order_no || row.cutting_no,
                    buyer: row.production_orders?.buyers?.name || 'N/A',
                    style: row.production_orders?.styles?.styleNo || 'N/A',
                    stage: 'Cutting',
                    planned: row.lay_count ? row.lay_count * 50 : 0, // Approx target or use fabric_issued_qty
                    actual: row.total_cut_qty || 0,
                    defects: 0,
                    efficiency: row.lay_count ? Math.round(((row.total_cut_qty || 0) / (row.lay_count * 50)) * 100) : 100,
                    responsible: 'Cutting Dept',
                    source: 'Auto-Cutting'
                })),
                ...(stitchingData || []).map(row => {
                    const totalActual = row.stitching_receive_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
                    return {
                        id: row.id,
                        date: row.receive_date || row.created_at,
                        order_no: row.production_orders?.order_no || row.receipt_no,
                        buyer: row.production_orders?.buyers?.name || 'N/A',
                        style: row.production_orders?.styles?.styleNo || 'N/A',
                        stage: 'Stitching (Rec)',
                        planned: 0, // Need target from production_order if available
                        actual: totalActual,
                        defects: 0,
                        efficiency: 100,
                        responsible: 'Stitching Dept',
                        source: 'Auto-Stitching'
                    }
                }),
                ...(qcData || []).map(row => {
                    const orderInfo = row.bundles?.cutting_order?.production_order;
                    return {
                        id: row.id,
                        date: row.created_at,
                        order_no: orderInfo?.order_no || 'N/A',
                        buyer: orderInfo?.buyers?.name || 'N/A',
                        style: orderInfo?.styles?.styleNo || 'N/A',
                        stage: 'QC Inspection',
                        planned: (row.passed_qty || 0) + (row.failed_qty || 0),
                        actual: row.passed_qty || 0,
                        defects: row.failed_qty || 0,
                        efficiency: Math.round(((row.passed_qty || 0) / ((row.passed_qty || 0) + (row.failed_qty || 0) || 1)) * 100),
                        responsible: 'QC Dept',
                        source: 'Auto-QC'
                    }
                })
            ].sort((a, b) => new Date(b.date) - new Date(a.date));

            setLedger(normalized);
        } catch (error) {
            console.error('Error fetching ledger:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLedger();
    }, []);

    const handlePostToERP = async (e) => {
        e.preventDefault();
        setSaving(true);
        
        try {
            const { error } = await supabase
                .from('dpr_logs')
                .insert([{
                    ...formData,
                    efficiency: efficiency,
                    report_date: new Date().toISOString().split('T')[0]
                }]);

            if (error) throw error;

            alert("Production Data Posted to ERP successfully!");
            setFormData({
                order_no: '',
                style_id: '',
                buyer_id: '',
                production_stage: 'Stitching',
                line_id: '',
                responsible_staff: '',
                machine_group: '',
                bundle_start: '',
                planned_target: 0,
                actual_produced: 0,
                defects_count: 0
            });
            fetchLedger();
        } catch (err) {
            console.error("Error posting DPR:", err);
            alert("Error: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleExport = () => {
        // Simple CSV Export
        const headers = ["Date", "Source", "Order ID", "Buyer/Style", "Stage", "Planned", "Actual", "Defects", "Efficiency", "Staff"];
        const csvContent = [
            headers.join(","),
            ...ledger.map(row => [
                new Date(row.date).toLocaleDateString(),
                row.source,
                row.order_no,
                `${row.buyer} / ${row.style}`,
                row.stage,
                row.planned,
                row.actual,
                row.defects,
                `${row.efficiency}%`,
                row.responsible
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Unified_Production_Ledger_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                            <Activity className="text-white" size={24} />
                        </div>
                        DPR EXECUTIVE WORKSPACE
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">Daily Production Reporting & Master System Ledger</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={fetchLedger}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <RefreshCw size={18} className={clsx(loading && "animate-spin")} />
                        Refresh
                    </button>
                    <button 
                        onClick={handleExport}
                        className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
                    >
                        <Download size={18} />
                        Export Ledger
                    </button>
                </div>
            </div>

            {/* Core Entry Form */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="bg-slate-50/50 px-8 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-200">
                            <Settings className="text-indigo-600" size={18} />
                        </div>
                        <h2 className="font-black text-slate-400 uppercase tracking-widest text-sm">Core DPR Data Entry</h2>
                    </div>
                    <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                        ERP_NODE: PRD_001
                    </div>
                </div>

                <form onSubmit={handlePostToERP} className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Row 1 */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Order Number <span className="text-red-500">*</span></label>
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input 
                                    type="text" 
                                    required
                                    placeholder="PO-XXXX"
                                    value={formData.order_no}
                                    onChange={(e) => setFormData({...formData, order_no: e.target.value})}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Style Master <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <select 
                                    required
                                    value={formData.style_id}
                                    onChange={(e) => {
                                        const sId = e.target.value;
                                        const selectedStyle = styles.find(s => s.id === sId);
                                        
                                        // Calculate total qty from sizeWiseDetails
                                        const totalQty = selectedStyle?.sizeWiseDetails?.reduce((sum, d) => sum + (parseFloat(d.qty) || 0), 0) || 0;

                                        // Find matching buyer (by ID or exact Name)
                                        const matchedBuyer = buyers.find(b => 
                                            (selectedStyle?.buyerId && b.id === selectedStyle.buyerId) || 
                                            (selectedStyle?.buyerName && b.name === selectedStyle.buyerName)
                                        );

                                        setFormData({
                                            ...formData, 
                                            style_id: sId,
                                            order_no: selectedStyle?.buyerPO || '',
                                            planned_target: totalQty,
                                            buyer_id: matchedBuyer?.id || formData.buyer_id
                                        });
                                    }}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all appearance-none"
                                >
                                    <option value="">Select Style</option>
                                    {filteredStyles.map(s => <option key={s.id} value={s.id}>{s.styleNo}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Buyer Entity</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <select 
                                    value={formData.buyer_id}
                                    onChange={(e) => setFormData({...formData, buyer_id: e.target.value})}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all appearance-none"
                                >
                                    <option value="">Select Buyer</option>
                                    {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Production Stage</label>
                            <div className="relative">
                                <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <select 
                                    value={formData.production_stage}
                                    onChange={(e) => setFormData({...formData, production_stage: e.target.value})}
                                    className="w-full pl-12 pr-4 py-3 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none text-center"
                                >
                                    <option value="Cutting">Cutting</option>
                                    <option value="Printing">Printing</option>
                                    <option value="Embroidery">Embroidery</option>
                                    <option value="Stitching">Stitching</option>
                                    <option value="Finishing">Finishing</option>
                                    <option value="Packing">Packing</option>
                                </select>
                            </div>
                        </div>

                        {/* Row 2 */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Line / Unit</label>
                            <div className="relative">
                                <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <select 
                                    value={formData.line_id}
                                    onChange={(e) => setFormData({...formData, line_id: e.target.value})}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all appearance-none"
                                >
                                    <option value="">Select Line</option>
                                    {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsible Staff</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Name"
                                    value={formData.responsible_staff}
                                    onChange={(e) => setFormData({...formData, responsible_staff: e.target.value})}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Machine Group</label>
                            <div className="relative">
                                <Settings className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="G-X"
                                    value={formData.machine_group}
                                    onChange={(e) => setFormData({...formData, machine_group: e.target.value})}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bundle Start</label>
                            <div className="relative">
                                <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="B-XXXX"
                                    value={formData.bundle_start}
                                    onChange={(e) => setFormData({...formData, bundle_start: e.target.value})}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* KPI Tiles */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50/80 p-6 rounded-3xl border border-dotted border-slate-200">
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all hover:scale-[1.02] cursor-default">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Planned Target</label>
                            <input 
                                type="number" 
                                value={formData.planned_target}
                                onChange={(e) => setFormData({...formData, planned_target: e.target.value})}
                                className="w-full text-3xl font-black text-slate-800 focus:outline-none text-center bg-transparent"
                            />
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all hover:scale-[1.02] cursor-default">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Actual Produced</label>
                            <input 
                                type="number" 
                                value={formData.actual_produced}
                                onChange={(e) => setFormData({...formData, actual_produced: e.target.value})}
                                className="w-full text-3xl font-black text-indigo-600 focus:outline-none text-center bg-transparent"
                            />
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all hover:scale-[1.02] cursor-default">
                            <label className="text-[10px] font-black text-red-400 uppercase tracking-widest block mb-4">Defects / QC Fail</label>
                            <input 
                                type="number" 
                                value={formData.defects_count}
                                onChange={(e) => setFormData({...formData, defects_count: e.target.value})}
                                className="w-full text-3xl font-black text-red-500 focus:outline-none text-center bg-transparent"
                            />
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-lg shadow-indigo-100 transition-all hover:scale-[1.02] cursor-default flex flex-col items-center justify-center">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Live Efficiency</label>
                            <div className={clsx(
                                "text-5xl font-black transition-colors",
                                efficiency >= 80 ? "text-emerald-500" : efficiency >= 50 ? "text-amber-500" : "text-rose-500"
                            )}>
                                {efficiency}%
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button 
                            type="submit"
                            disabled={saving}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-200 transition-all flex items-center gap-3 disabled:opacity-50"
                        >
                            <ChevronRight size={20} />
                            {saving ? 'Posting...' : 'Post to ERP'}
                        </button>
                    </div>
                </form>
            </div>

            {/* System Master Ledger */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="bg-slate-50/50 px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-black text-slate-800 uppercase tracking-tight">System Master Ledger - Daily Production</h2>
                    <div className="flex items-center gap-3">
                        {/* Search Column */}
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={14} />
                            <input 
                                type="text" 
                                placeholder="Search Order, Style, Buyer..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all w-64 shadow-sm"
                            />
                        </div>

                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            Live Synchronized
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-4">Date</th>
                                <th className="px-4 py-4 text-center">Source</th>
                                <th className="px-4 py-4">Order ID</th>
                                <th className="px-4 py-4">Buyer / Style</th>
                                <th className="px-4 py-4">Operational Stage</th>
                                <th className="px-4 py-4 text-center">Planned</th>
                                <th className="px-4 py-4 text-center text-indigo-600">Actual</th>
                                <th className="px-4 py-4 text-center text-red-500">Defects</th>
                                <th className="px-4 py-4 text-center">Efficiency</th>
                                <th className="px-4 py-4">Supervisor</th>
                                <th className="px-8 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {(() => {
                                const filtered = ledger.filter(row => 
                                    row.order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    row.buyer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    row.style?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    row.stage?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    row.source?.toLowerCase().includes(searchTerm.toLowerCase())
                                );

                                if (filtered.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan="11" className="px-8 py-20 text-center">
                                                {loading ? (
                                                    <div className="flex flex-col items-center gap-4 text-slate-400">
                                                        <RefreshCw className="animate-spin" size={32} />
                                                        <span className="font-bold tracking-widest uppercase text-xs">Accessing ERP Core...</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-slate-300 font-bold tracking-widest uppercase text-xs">No records found matching "{searchTerm}"</div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                }

                                return filtered.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-4 font-mono text-xs text-slate-400">{new Date(row.date).toLocaleDateString()}</td>
                                        <td className="px-4 py-4">
                                            <div className={clsx(
                                                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter text-center border",
                                                row.source === 'Manual' ? "bg-slate-100 border-slate-200 text-slate-500" :
                                                row.source === 'Auto-Cutting' ? "bg-amber-50 border-amber-100 text-amber-600" :
                                                row.source === 'Auto-Stitching' ? "bg-indigo-50 border-indigo-100 text-indigo-600" :
                                                "bg-rose-50 border-rose-100 text-rose-600"
                                            )}>
                                                {row.source}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 font-black text-slate-700 text-sm">{row.order_no}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-800">{row.buyer}</span>
                                                <span className="text-[10px] font-bold text-slate-400">{row.style}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 uppercase">
                                                {row.stage}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center font-bold text-slate-400 text-sm">{row.planned}</td>
                                        <td className="px-4 py-4 text-center font-black text-indigo-600 text-sm">{row.actual}</td>
                                        <td className="px-4 py-4 text-center font-black text-red-500 text-sm">{row.defects}</td>
                                        <td className="px-4 py-4 text-center">
                                            <div className={clsx(
                                                "font-black text-sm",
                                                row.efficiency >= 80 ? "text-emerald-500" : row.efficiency >= 50 ? "text-amber-500" : "text-rose-500"
                                            )}>
                                                {row.efficiency}%
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 font-bold text-slate-500 text-xs">{row.responsible}</td>
                                        <td className="px-8 py-4 text-right">
                                            {row.source === 'Manual' && (
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button className="p-2 hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-slate-200 text-slate-400 hover:text-indigo-600 transition-all">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button className="p-2 hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-red-100 text-slate-400 hover:text-red-500 transition-all">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DPRWorkspace;
