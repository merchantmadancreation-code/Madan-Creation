import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
    CheckSquare, Search, Box, ShieldCheck,
    AlertOctagon, Package, ChevronRight, BarChart2, Printer, X
} from 'lucide-react';
import clsx from 'clsx';

const FinishingList = () => {
    const [inspections, setInspections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dhuReportQC, setDhuReportQC] = useState(null);
    const [stats, setStats] = useState({
        passedToday: 0,
        rejectionRate: 0,
        packedCartons: 0
    });

    useEffect(() => {
        const fetchInspections = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('qc_inspections')
                .select(`
                    *,
                    bundles (
                        bundle_no,
                        size,
                        cutting_orders (
                            production_orders (
                                order_no,
                                styles (styleNo)
                            )
                        )
                    ),
                    finishing_receive_items (
                        size,
                        finishing_receives (
                            receipt_no,
                            production_orders (
                                order_no,
                                styles (styleNo)
                            )
                        )
                    )
                `)
                .order('created_at', { ascending: false });

            // Fetch Cartons Count
            const { count: cartonCount } = await supabase
                .from('cartons')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'Sealed');

            if (!error && data) {
                setInspections(data);

                // Calculate Stats
                const today = new Date().toISOString().split('T')[0];
                const todayInspections = data.filter(i => i.created_at.startsWith(today));

                const passedToday = todayInspections.reduce((sum, i) => sum + (i.passed_qty || 0), 0);

                const totalInspected = data.reduce((sum, i) => sum + (i.passed_qty || 0) + (i.failed_qty || 0), 0);
                const totalFailed = data.reduce((sum, i) => sum + (i.failed_qty || 0), 0);
                const rejectionRate = totalInspected > 0 ? ((totalFailed / totalInspected) * 100).toFixed(1) : 0;

                setStats({
                    passedToday,
                    rejectionRate,
                    packedCartons: cartonCount || 0
                });
            }
            setLoading(false);
        };
        fetchInspections();
    }, []);

    const handleDHUReport = (qc) => {
        setDhuReportQC(qc);
    };

    const handlePrintDHU = () => {
        window.print();
    };

    const filtered = inspections.filter(i =>
        (i.bundles?.bundle_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.bundles?.cutting_orders?.production_orders?.order_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.finishing_receive_items?.finishing_receives?.production_orders?.styles?.styleNo || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 relative">
            <style>
                {`
                    @media print {
                        body * { visibility: hidden; }
                        #dhu-print-area, #dhu-print-area * { visibility: visible; }
                        #dhu-print-area { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; }
                        .no-print { display: none !important; }
                    }
                `}
            </style>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-sage-800">Finishing & QC Hub</h1>
                    <p className="text-sage-500 text-sm">Quality control checkpoints and packing management</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        to="/finishing/packing"
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-sage-200 text-sage-700 rounded-xl hover:bg-sage-50 transition-all font-bold shadow-sm"
                    >
                        <Box size={18} /> Carton Packing
                    </Link>
                    <Link
                        to="/finishing/new"
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-sage-800 text-white rounded-xl hover:bg-sage-900 transition-all shadow-lg font-bold"
                    >
                        <ShieldCheck size={18} /> New Inspection
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Passed Today', value: stats.passedToday, sub: 'Pieces', icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Rejection Rate', value: `${stats.rejectionRate}%`, sub: 'Lower is better', icon: AlertOctagon, color: 'text-red-600', bg: 'bg-red-50' },
                    { label: 'Packed & Ready', value: stats.packedCartons, sub: 'Sealed Cartons', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-sage-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className={clsx("p-3 rounded-xl", stat.bg, stat.color)}>
                                <stat.icon size={24} />
                            </div>
                            <span className="text-[10px] font-bold text-sage-400 uppercase tracking-widest">{stat.sub}</span>
                        </div>
                        <div className="text-[10px] font-bold text-sage-400 uppercase tracking-widest mb-1">{stat.label}</div>
                        <div className="text-3xl font-black text-sage-800">{stat.value}</div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-sage-200 overflow-hidden">
                <div className="p-4 border-b border-sage-100 bg-sage-50/30 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search bundle or order..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-sage-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="bg-sage-50 text-sage-700 font-bold border-b border-sage-200">
                                <th className="px-6 py-4">Bundle / Date</th>
                                <th className="px-6 py-4">Style & Order</th>
                                <th className="px-6 py-4">Inspection Result</th>
                                <th className="px-6 py-4">Rejects</th>
                                <th className="px-6 py-4">Inspector</th>
                                <th className="px-6 py-4 text-right">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sage-100">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-sage-400 italic">Reading quality reports...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-sage-400 italic">No quality inspections found.</td></tr>
                            ) : filtered.map((qc) => (
                                <tr key={qc.id} className="hover:bg-sage-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-sage-800 uppercase">{qc.bundles?.bundle_no || (qc.finishing_receive_items ? `${qc.finishing_receive_items.finishing_receives?.receipt_no}-${qc.finishing_receive_items.size}` : 'N/A')}</div>
                                        <div className="text-[10px] text-sage-400 font-mono mt-0.5 uppercase tracking-wider">{new Date(qc.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sage-800 font-bold">
                                            {qc.bundles?.cutting_orders?.production_orders?.styles?.styleNo || qc.finishing_receive_items?.finishing_receives?.production_orders?.styles?.styleNo}
                                        </div>
                                        <div className="text-[10px] text-sage-400 font-bold">
                                            {qc.bundles?.cutting_orders?.production_orders?.order_no || qc.finishing_receive_items?.finishing_receives?.production_orders?.order_no}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">PASSED: {qc.passed_qty}</div>
                                            <div className="text-[10px] text-sage-400">of {(qc.passed_qty || 0) + (qc.failed_qty || 0)}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-red-600">
                                        {qc.failed_qty} pcs
                                    </td>
                                    <td className="px-6 py-4 text-sage-500">
                                        Admin
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDHUReport(qc)}
                                            className="text-sage-600 hover:text-sage-900 font-bold flex items-center gap-1 ml-auto"
                                        >
                                            DHU Report <BarChart2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* DHU Report Modal */}
            {dhuReportQC && (
                <div className="fixed inset-0 bg-sage-900/40 backdrop-blur-sm z-50 flex justify-center py-10 overflow-y-auto">
                    <div className="bg-white max-w-2xl w-full mx-auto relative rounded-xl shadow-2xl h-fit border border-sage-200" id="dhu-print-area">
                        {/* Header Actions (No Print) */}
                        <div className="flex justify-end gap-2 p-4 no-print border-b border-sage-100 bg-sage-50 rounded-t-xl">
                            <button onClick={handlePrintDHU} className="px-4 py-2 bg-sage-800 text-white font-bold rounded-lg hover:bg-sage-900 transition-colors flex items-center gap-2 text-sm shadow-sm">
                                <Printer size={16} /> Print Report
                            </button>
                            <button onClick={() => setDhuReportQC(null)} className="p-2 text-sage-400 hover:text-sage-800 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-sage-200">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Document Content */}
                        <div className="p-10 space-y-8 bg-white">
                            {/* Company Branding */}
                            <div className="text-center border-b-2 border-sage-800 pb-6">
                                <h1 className="text-3xl font-black text-sage-900 tracking-tight">MADAN CREATION</h1>
                                <p className="text-sage-500 font-medium uppercase tracking-widest text-sm mt-1">Defects per Hundred Units (DHU) Report</p>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                <div>
                                    <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest">Inspection ID</label>
                                    <div className="font-mono text-sage-800 font-bold">{dhuReportQC.id.split('-')[0].toUpperCase()}</div>
                                </div>
                                <div className="text-right">
                                    <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest">Date / Time</label>
                                    <div className="font-medium text-sage-800">{new Date(dhuReportQC.created_at).toLocaleString()}</div>
                                </div>
                                <div className="col-span-2 bg-sage-50 p-4 rounded-xl border border-sage-100 grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest">Bundle / Item</label>
                                        <div className="font-bold text-sage-800 uppercase">{dhuReportQC.bundles?.bundle_no || (dhuReportQC.finishing_receive_items ? `${dhuReportQC.finishing_receive_items.finishing_receives?.receipt_no}-${dhuReportQC.finishing_receive_items.size}` : 'N/A')}</div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest">Style No</label>
                                        <div className="font-bold text-sage-800">{dhuReportQC.bundles?.cutting_orders?.production_orders?.styles?.styleNo || dhuReportQC.finishing_receive_items?.finishing_receives?.production_orders?.styles?.styleNo || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest">Size</label>
                                        <div className="font-bold text-sage-800">{dhuReportQC.bundles?.size || dhuReportQC.finishing_receive_items?.size || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Details Table */}
                            <div className="overflow-hidden rounded-xl border border-sage-200">
                                <table className="w-full text-left">
                                    <thead className="bg-sage-100">
                                        <tr>
                                            <th className="px-6 py-3 text-[11px] font-black uppercase tracking-wider text-sage-600">Metric</th>
                                            <th className="px-6 py-3 text-[11px] font-black uppercase tracking-wider text-sage-600 text-right">Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-sage-100">
                                        <tr>
                                            <td className="px-6 py-4 font-bold text-sage-800">Total Quantity Inspected</td>
                                            <td className="px-6 py-4 font-black text-blue-600 text-right text-lg">{(dhuReportQC.passed_qty || 0) + (dhuReportQC.failed_qty || 0)} Pcs</td>
                                        </tr>
                                        <tr>
                                            <td className="px-6 py-4 font-bold text-sage-800 flex items-center gap-2"><ShieldCheck size={16} className="text-green-500" /> Passed Quantity</td>
                                            <td className="px-6 py-4 font-black text-green-700 text-right">{dhuReportQC.passed_qty || 0} Pcs</td>
                                        </tr>
                                        <tr className="bg-red-50/30">
                                            <td className="px-6 py-4 font-bold text-red-800 flex items-center gap-2"><AlertOctagon size={16} className="text-red-500" /> Defective Quantity</td>
                                            <td className="px-6 py-4 font-black text-red-600 text-right">{dhuReportQC.failed_qty || 0} Pcs</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* DHU Computation Banner */}
                            <div className="bg-sage-800 text-white p-6 rounded-xl shadow-lg flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-sage-200 uppercase tracking-widest text-xs">Calculated DHU</div>
                                    <div className="text-sm text-sage-300 mt-1 opacity-80">(Defects / Total Inspected) × 100</div>
                                </div>
                                <div className="text-5xl font-black tabular-nums tracking-tighter">
                                    {((dhuReportQC.passed_qty || 0) + (dhuReportQC.failed_qty || 0)) === 0
                                        ? '0.00'
                                        : (((dhuReportQC.failed_qty || 0) / ((dhuReportQC.passed_qty || 0) + (dhuReportQC.failed_qty || 0))) * 100).toFixed(2)}%
                                </div>
                            </div>

                            {/* Remarks */}
                            {dhuReportQC.remarks && (
                                <div className="border border-sage-200 rounded-xl p-4 bg-white">
                                    <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest block mb-1">Inspector Remarks</label>
                                    <p className="text-sm font-medium text-sage-800 italic">{dhuReportQC.remarks}</p>
                                </div>
                            )}

                            {/* Signatures */}
                            <div className="grid grid-cols-2 pt-12 gap-8">
                                <div className="border-t-2 border-sage-200 pt-2 text-center">
                                    <p className="font-bold text-sage-800 text-sm">Quality Inspector</p>
                                    <p className="text-[10px] uppercase tracking-widest text-sage-400 mt-1">Signature & Date</p>
                                </div>
                                <div className="border-t-2 border-sage-200 pt-2 text-center">
                                    <p className="font-bold text-sage-800 text-sm">Finishing Manager</p>
                                    <p className="text-[10px] uppercase tracking-widest text-sage-400 mt-1">Signature & Date</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinishingList;
