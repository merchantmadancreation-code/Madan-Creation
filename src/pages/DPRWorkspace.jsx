import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    Activity, Download, RefreshCw, Search, Calendar, Package,
    Settings, User, Layers, ChevronRight, Plus, X, Image as ImageIcon,
    ArrowLeft, Eye
} from 'lucide-react';
import clsx from 'clsx';
import { useProduction } from '../context/ProductionContext';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';

const DPRWorkspace = () => {
    const navigate = useNavigate();
    const { buyers = [], lines = [] } = useProduction();
    const { styles = [] } = usePurchaseOrder();
    
    // UI State
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showEntryForm, setShowEntryForm] = useState(false);
    
    // View State
    const [overviewData, setOverviewData] = useState([]);
    const [kpis, setKpis] = useState({
        totalOrders: 0, fabricStatus: 0, cutting: 0, 
        stitching: 0, finishing: 0, packing: 0, dispatch: 0
    });
    const [filters, setFilters] = useState({
        style: '', po: '', date: '', stage: 'All Stages'
    });

    // Form State (Old Core DPR Data Entry)
    const [formData, setFormData] = useState({
        order_no: '', style_id: '', buyer_id: '', production_stage: 'Stitching',
        line_id: '', responsible_staff: '', machine_group: '', bundle_start: '',
        planned_target: 0, actual_produced: 0, defects_count: 0
    });
    const [efficiency, setEfficiency] = useState(0);
    const [sizeData, setSizeData] = useState([]);

    useEffect(() => {
        if (formData.production_stage === 'Cutting') {
            const actualSum = sizeData.reduce((sum, item) => sum + (parseFloat(item.actual) || 0), 0);
            const targetSum = sizeData.reduce((sum, item) => sum + (parseFloat(item.target) || 0), 0);
            if (formData.actual_produced !== actualSum || formData.planned_target !== targetSum) {
                setFormData(prev => ({
                    ...prev,
                    actual_produced: actualSum,
                    planned_target: targetSum
                }));
            }
        }
    }, [sizeData, formData.production_stage]);

    useEffect(() => {
        const target = parseFloat(formData.planned_target) || 0;
        const actual = parseFloat(formData.actual_produced) || 0;
        if (target > 0) {
            setEfficiency(Math.round((actual / target) * 100));
        } else {
            setEfficiency(0);
        }
    }, [formData.planned_target, formData.actual_produced]);

    const handlePostToERP = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Prepare payload
            const payload = {
                ...formData,
                efficiency: efficiency,
                report_date: new Date().toISOString().split('T')[0]
            };

            // Safely pack sizeData into the legacy bundle_start text field for Cutting
            if (formData.production_stage === 'Cutting' && sizeData.length > 0) {
                payload.bundle_start = JSON.stringify(sizeData);
            }

            const { error } = await supabase
                .from('dpr_logs')
                .insert([payload]);

            if (error) throw error;
            alert("Production Data Posted to ERP successfully!");
            setFormData({
                order_no: '', style_id: '', buyer_id: '', production_stage: 'Stitching',
                line_id: '', responsible_staff: '', machine_group: '', bundle_start: '',
                planned_target: 0, actual_produced: 0, defects_count: 0
            });
            setSizeData([]);
            fetchOverview();
            // Go back to dashboard view
            setShowEntryForm(false);
        } catch (err) {
            console.error("Error posting DPR:", err);
            alert("Error: " + err.message);
        } finally {
            setSaving(false);
        }
    };
    // ---------------------------------

    // --- DASHBOARD AGGREGATION LOGIC ---
    const fetchOverview = async () => {
        setLoading(true);
        try {
            // 1. Fetch Production Orders
            const { data: poData } = await supabase
                .from('production_orders')
                .select(`
                    id, order_no, order_date, total_qty, status,
                    styles ( styleNo, image, fabricName, sizeWiseDetails )
                `)
                .order('created_at', { ascending: false });

            // 2. Fetch Cutting Aggregates
            const { data: cutData } = await supabase
                .from('cutting_orders')
                .select('order_id, total_fabric_received, total_cut_qty');

            // 3. Fetch Stitching Aggregates
            const { data: stitchData } = await supabase
                .from('stitching_receives')
                .select('production_order_id, stitching_receive_items(quantity)');

            // 4. Fetch Manual Finishing/Packing DPR Logs 
            const { data: dprData } = await supabase
                .from('dpr_logs')
                .select('order_no, production_stage, actual_produced, defects_count');

            // Grouping logic
            const cutMap = {};
            cutData?.forEach(cut => {
                if(!cutMap[cut.order_id]) cutMap[cut.order_id] = { fabric_rec: 0, cut_qty: 0 };
                cutMap[cut.order_id].fabric_rec += (Number(cut.total_fabric_received) || 0);
                cutMap[cut.order_id].cut_qty += (Number(cut.total_cut_qty) || 0);
            });

            const stitchMap = {};
            stitchData?.forEach(st => {
                if(!stitchMap[st.production_order_id]) stitchMap[st.production_order_id] = 0;
                st.stitching_receive_items?.forEach(item => {
                    stitchMap[st.production_order_id] += (Number(item.quantity) || 0);
                });
            });

            const dprMap = {};
            // console.log("RAW DPR DATA:", dprData); // Debug log for user console

            dprData?.forEach(log => {
                const orderNo = (log.order_no || "").trim();
                if (!orderNo) return;
                
                if (!dprMap[orderNo]) dprMap[orderNo] = { cutting: 0, stitching: 0, finishing: 0, packing: 0 };
                
                const val = parseFloat(log.actual_produced) || 0;
                
                if (log.production_stage === 'Cutting') dprMap[orderNo].cutting += val;
                if (log.production_stage === 'Stitching') dprMap[orderNo].stitching += val;
                if (log.production_stage === 'Finishing') dprMap[orderNo].finishing += val;
                if (log.production_stage === 'Packing') dprMap[orderNo].packing += val;
            });

            let totOrders = poData?.length || 0;
            let totFabric = 0;
            let totCutting = 0;
            let totStitching = 0;
            let totFinishing = 0;
            let totPacking = 0;

            const consolidated = poData?.map(po => {
                const poNum = (po.order_no || "").trim();
                const cuts = cutMap[po.id] || { fabric_rec: 0, cut_qty: 0 };
                const stitches = stitchMap[po.id] || 0;
                const logs = dprMap[poNum] || { cutting: 0, stitching: 0, finishing: 0, packing: 0 };

                // Combine values from specific specific tables and generic dpr_logs
                const finalCutting = Math.round(cuts.cut_qty + logs.cutting);
                const finalStitching = Math.round(stitches + logs.stitching);

                totFabric += cuts.fabric_rec;
                totCutting += finalCutting;
                totStitching += finalStitching;
                totFinishing += logs.finishing;
                totPacking += logs.packing;
                
                let sizesStr = "N/A";
                if (po.styles?.sizeWiseDetails?.length > 0) {
                     sizesStr = po.styles.sizeWiseDetails.map(d => d.size).join(', ');
                     if(sizesStr.length > 15) sizesStr = sizesStr.substring(0, 15)+'...';
                }

                return {
                    id: po.id,
                    date: po.order_date,
                    po_number: po.order_no,
                    style_no: po.styles?.styleNo || 'N/A',
                    image: po.styles?.image,
                    fabric_name: po.styles?.fabricName || 'N/A',
                    fabric_status: cuts.fabric_rec > 0 ? `${cuts.fabric_rec}m` : '0m',
                    size: sizesStr,
                    fabric_rec: cuts.fabric_rec,
                    cutting: finalCutting,
                    stitching: finalStitching,
                    finishing: logs.finishing,
                    packing: logs.packing,
                    balance: (po.total_qty || 0) - logs.packing,
                    status: po.status
                };
            }) || [];

            setOverviewData(consolidated);
            setKpis({
                totalOrders: totOrders,
                fabricStatus: totFabric,
                cutting: totCutting,
                stitching: totStitching,
                finishing: totFinishing,
                packing: totPacking,
                dispatch: totPacking
            });
        } catch (error) {
            console.error('Error fetching overview:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOverview();
    }, []);

    const clearFilters = () => {
        setFilters({ style: '', po: '', date: '', stage: 'All Stages' });
    };

    const handleExportExcel = () => {
        const headers = ["DATE", "PO NUMBER", "STYLE NO", "FABRIC NAME", "FABRIC STATUS", "SIZE", "FABRIC REC", "CUTTING", "STITCHING", "FINISHING", "PACKING", "BALANCE"];
        const csvContent = [
            headers.join(","),
            ...overviewData.map(row => [
                new Date(row.date).toLocaleDateString(),
                row.po_number,
                row.style_no,
                row.fabric_name,
                row.fabric_status,
                `"${row.size}"`,
                row.fabric_rec,
                row.cutting,
                row.stitching,
                row.finishing,
                row.packing,
                row.balance
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `DPR_Master_Table_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    // Filter Logic
    const displayData = overviewData.filter(row => {
        const styleMatch = row.style_no.toLowerCase().includes(filters.style.toLowerCase());
        const poMatch = row.po_number.toLowerCase().includes(filters.po.toLowerCase());
        const dateMatch = !filters.date || String(row.date).includes(filters.date);
        
        let stageMatch = true;
        if (filters.stage !== 'All Stages') {
            if (filters.stage === 'Cutting') stageMatch = row.cutting > 0;
            else if (filters.stage === 'Stitching') stageMatch = row.stitching > 0;
            else if (filters.stage === 'Finishing') stageMatch = row.finishing > 0;
            else if (filters.stage === 'Packing') stageMatch = row.packing > 0;
        }

        return styleMatch && poMatch && dateMatch && stageMatch;
    });

    if (showEntryForm) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-4">
                    <button 
                        onClick={() => setShowEntryForm(false)}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <ArrowLeft size={18} />
                        Back to Dashboard
                    </button>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Activity className="text-indigo-600" size={24} />
                        DPR Data Entry
                    </h1>
                </div>

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
                                    <input type="text" required placeholder="PO-XXXX"
                                        value={formData.order_no} onChange={(e) => setFormData({...formData, order_no: e.target.value})}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Style Master <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                    <select required value={formData.style_id}
                                        onChange={(e) => {
                                            const sId = e.target.value;
                                            const selectedStyle = styles.find(s => s.id === sId);
                                            const totalQty = selectedStyle?.sizeWiseDetails?.reduce((sum, d) => sum + (parseFloat(d.qty) || 0), 0) || 0;
                                            const matchedBuyer = buyers.find(b => 
                                                (selectedStyle?.buyerId && b.id === selectedStyle.buyerId) || 
                                                (selectedStyle?.buyerName && b.name === selectedStyle.buyerName)
                                            );
                                            
                                            // Setup Size Data for Cutting
                                            if (selectedStyle && selectedStyle.sizeWiseDetails) {
                                                setSizeData(selectedStyle.sizeWiseDetails.map(d => ({
                                                    size: d.size,
                                                    target: parseFloat(d.qty) || 0,
                                                    actual: 0
                                                })));
                                            } else {
                                                setSizeData([]);
                                            }

                                            setFormData({
                                                ...formData, style_id: sId, order_no: selectedStyle?.buyerPO || '',
                                                planned_target: totalQty, buyer_id: matchedBuyer?.id || formData.buyer_id
                                            });
                                        }}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all appearance-none"
                                    >
                                        <option value="">Select Style</option>
                                        {styles.map(s => <option key={s.id} value={s.id}>{s.styleNo}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Buyer Entity</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                    <select value={formData.buyer_id} onChange={(e) => setFormData({...formData, buyer_id: e.target.value})}
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
                                    <select value={formData.production_stage} onChange={(e) => setFormData({...formData, production_stage: e.target.value})}
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

                            {/* Row 2 Conditional */}
                            {['Stitching', 'Finishing', 'Packing'].includes(formData.production_stage) && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Line / Unit</label>
                                    <div className="relative">
                                        <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                        <select value={formData.line_id} onChange={(e) => setFormData({...formData, line_id: e.target.value})}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all appearance-none"
                                        >
                                            <option value="">Select Line</option>
                                            {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsible Staff</label>
                                <input type="text" placeholder="Name" value={formData.responsible_staff} onChange={(e) => setFormData({...formData, responsible_staff: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700" />
                            </div>

                            {['Stitching', 'Embroidery', 'Printing'].includes(formData.production_stage) && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Machine Group</label>
                                    <input type="text" placeholder="G-X" value={formData.machine_group} onChange={(e) => setFormData({...formData, machine_group: e.target.value})}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700" />
                                </div>
                            )}

                            {['Cutting', 'Stitching'].includes(formData.production_stage) && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bundle Start</label>
                                    <input type="text" placeholder="B-XXXX" value={formData.bundle_start} onChange={(e) => setFormData({...formData, bundle_start: e.target.value})}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700" />
                                </div>
                            )}
                        </div>

                        {/* Size Wise Input Section (Cutting only) */}
                        {formData.production_stage === 'Cutting' && sizeData.length > 0 && (
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Size-Wise Cutting Entry</h3>
                                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                                    {sizeData.map((item, idx) => (
                                        <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-black text-slate-700">{item.size}</span>
                                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                    Order: {item.target}
                                                </span>
                                            </div>
                                            <input 
                                                type="number" 
                                                min="0"
                                                value={item.actual}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const newSizeData = [...sizeData];
                                                    newSizeData[idx].actual = val === '' ? '' : parseInt(val) || 0;
                                                    setSizeData(newSizeData);
                                                }}
                                                placeholder="Cut Qty"
                                                className="w-full text-lg font-black text-indigo-700 bg-white border border-slate-200 rounded-lg py-2 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-inner"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* KPI Tiles */}
                        <div className={clsx(
                            "grid gap-6 bg-slate-50/80 p-6 rounded-3xl border border-dotted border-slate-200",
                            formData.production_stage === 'Cutting' ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-4"
                        )}>
                            {formData.production_stage !== 'Cutting' && (
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all hover:scale-[1.02] cursor-default">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Planned Target</label>
                                    <input type="number" value={formData.planned_target} onChange={(e) => setFormData({...formData, planned_target: e.target.value})}
                                        className="w-full text-3xl font-black text-slate-800 focus:outline-none text-center bg-transparent" />
                                </div>
                            )}

                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all hover:scale-[1.02] cursor-default">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Actual Produced</label>
                                <input type="number" value={formData.actual_produced} 
                                    readOnly={formData.production_stage === 'Cutting'}
                                    onChange={(e) => setFormData({...formData, actual_produced: e.target.value})}
                                    className={clsx(
                                        "w-full text-3xl font-black text-indigo-600 focus:outline-none text-center bg-transparent",
                                        formData.production_stage === 'Cutting' && "opacity-80"
                                    )} 
                                />
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all hover:scale-[1.02] cursor-default">
                                <label className="text-[10px] font-black text-red-400 uppercase tracking-widest block mb-4">Defects / QC Fail</label>
                                <input type="number" value={formData.defects_count} onChange={(e) => setFormData({...formData, defects_count: e.target.value})}
                                    className="w-full text-3xl font-black text-red-500 focus:outline-none text-center bg-transparent" />
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-lg shadow-indigo-100 flex flex-col items-center justify-center">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Live Efficiency</label>
                                <div className={clsx("text-5xl font-black transition-colors", efficiency >= 80 ? "text-emerald-500" : efficiency >= 50 ? "text-amber-500" : "text-rose-500")}>
                                    {efficiency}%
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-200 transition-all flex items-center gap-3">
                                <ChevronRight size={20} />
                                {saving ? 'Posting...' : 'Post to ERP'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* KPI Cards Strip */}
            <div className="flex gap-4 items-stretch w-full overflow-x-auto no-scrollbar pb-2">
                {[
                    { label: "TOTAL ORDERS", value: kpis.totalOrders },
                    { label: "FABRIC STATUS", value: kpis.fabricStatus > 0 ? `${kpis.fabricStatus}m` : '0m' },
                    { label: "TOTAL CUTTING", value: kpis.cutting },
                    { label: "TOTAL STITCHING", value: kpis.stitching },
                    { label: "TOTAL FINISHING", value: kpis.finishing },
                    { label: "TOTAL PACKING", value: kpis.packing },
                    { label: "DISPATCH READY", value: kpis.dispatch }
                ].map((stat, i) => (
                    <div key={i} className="min-w-[140px] flex-1 bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col gap-1">
                        <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{stat.label}</span>
                        <span className="text-2xl font-black text-slate-800">{stat.value}</span>
                    </div>
                ))}
                <button 
                    onClick={() => setShowEntryForm(true)}
                    className="min-w-[160px] bg-[#203170] hover:bg-[#1a285d] text-white rounded-xl shadow-lg transition-all p-4 flex items-center justify-center gap-2 font-bold tracking-widest text-sm uppercase group"
                >
                    <Plus size={18} className="transition-transform group-hover:rotate-90" />
                    DPR ENTRY
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px] space-y-2">
                    <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-1">Filter by Style</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input type="text" placeholder="Search Style..." 
                            value={filters.style} onChange={(e) => setFilters({...filters, style: e.target.value})}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:bg-white" />
                    </div>
                </div>

                <div className="flex-1 min-w-[200px] space-y-2">
                    <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-1">Filter by Order</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input type="text" placeholder="Search PO..." 
                            value={filters.po} onChange={(e) => setFilters({...filters, po: e.target.value})}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:bg-white" />
                    </div>
                </div>

                <div className="flex-1 min-w-[200px] space-y-2">
                    <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-1">Filter by Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input type="date" 
                            value={filters.date} onChange={(e) => setFilters({...filters, date: e.target.value})}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:bg-white" />
                    </div>
                </div>

                <div className="flex-1 min-w-[200px] space-y-2">
                    <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-1">Production Stage</label>
                    <select 
                        value={filters.stage} onChange={(e) => setFilters({...filters, stage: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:bg-white appearance-none"
                    >
                        <option value="All Stages">All Stages</option>
                        <option value="Cutting">Cutting</option>
                        <option value="Stitching">Stitching</option>
                        <option value="Finishing">Finishing</option>
                        <option value="Packing">Packing</option>
                    </select>
                </div>

                <button 
                    onClick={clearFilters}
                    className="px-6 py-2 border border-slate-200 rounded-lg text-slate-500 font-bold text-sm tracking-widest uppercase hover:bg-slate-50 transition-colors"
                >
                    Clear
                </button>
            </div>

            {/* Master Table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <Activity className="text-indigo-600" size={20} />
                            DPR DASHBOARD MASTER TABLE
                        </h2>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Consolidated Production Overview</p>
                    </div>
                    
                    <div className="flex gap-2">
                        <button onClick={fetchOverview} className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-all flex items-center gap-2">
                            <RefreshCw size={14} className={clsx(loading && "animate-spin text-indigo-500")} />
                        </button>
                        <button onClick={handleExportExcel} className="px-4 py-1.5 border border-slate-200 rounded-lg text-slate-600 font-bold hover:bg-slate-50 transition-all flex items-center gap-2 text-xs uppercase tracking-widest">
                            <Download size={14} /> EXCEL
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-[#f8fafc] text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">DATE</th>
                                <th className="px-6 py-4">PO NUMBER</th>
                                <th className="px-6 py-4">STYLE NO.</th>
                                <th className="px-6 py-4 text-center">IMAGE</th>
                                <th className="px-6 py-4">FABRIC NAME</th>
                                <th className="px-6 py-4">FABRIC STATUS</th>
                                <th className="px-6 py-4">SIZE</th>
                                <th className="px-6 py-4 text-right">FABRIC REC.</th>
                                <th className="px-6 py-4 text-right">CUTTING</th>
                                <th className="px-6 py-4 text-right">STITCHING</th>
                                <th className="px-6 py-4">Finishing</th>
                                <th className="px-6 py-4">Packing</th>
                                <th className="px-6 py-4 text-indigo-600">Balance</th>
                                <th className="px-6 py-4 text-center text-red-600">LIVE ACTIONS 🚀</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="14" className="text-center py-12"><RefreshCw className="animate-spin mx-auto text-indigo-200" size={32} /></td></tr>
                            ) : displayData.length === 0 ? (
                                <tr><td colSpan="14" className="text-center py-12 text-slate-400 font-bold tracking-widest uppercase text-xs">No records found</td></tr>
                            ) : (
                                displayData.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-xs font-mono text-slate-500">{new Date(row.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-sm font-black text-slate-700">{row.po_number}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-600">{row.style_no}</td>
                                        <td className="px-6 py-4 text-center">
                                            {row.image ? (
                                                <img src={row.image} alt="style" className="w-10 h-10 object-cover rounded-lg border border-slate-200 inline-block bg-white" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg border border-slate-200 inline-flex items-center justify-center bg-slate-50 text-slate-300">
                                                    <ImageIcon size={16} />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-slate-500">{row.fabric_name}</td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md border",
                                                row.fabric_rec > 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                            )}>
                                                {row.fabric_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-slate-500 max-w-[120px] truncate" title={row.size}>{row.size}</td>
                                        <td className="px-6 py-4 text-sm font-black text-slate-600 text-right">{row.fabric_rec}</td>
                                        <td className="px-6 py-4 text-sm font-black text-slate-600 text-right">{row.cutting}</td>
                                        <td className="px-6 py-4 text-sm font-black text-slate-600 text-right">{row.stitching}</td>
                                        <td className="px-6 py-4 text-sm font-black text-slate-600 text-right">{row.finishing}</td>
                                        <td className="px-6 py-4 text-sm font-black text-slate-600 text-right">{row.packing}</td>
                                        <td className="px-6 py-4 text-sm font-black text-indigo-600 text-right">{row.balance}</td>
                                        <td className="px-6 py-4 text-center">
                                            <Link 
                                                to={`/production-orders/${row.id}`}
                                                title={`View Production Order ${row.po_number}`}
                                                className="p-1.5 rounded-lg text-sage-600 hover:bg-sage-100 hover:text-indigo-600 transition-colors inline-block"
                                            >
                                                <Eye size={18} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DPRWorkspace;
