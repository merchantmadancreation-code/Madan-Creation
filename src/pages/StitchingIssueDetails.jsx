import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Printer, Download, User, Calendar, Tag, Package, Hash, Scissors } from 'lucide-react';
import clsx from 'clsx';

const StitchingIssueDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [issue, setIssue] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            const { data: issueData, error } = await supabase
                .from('stitching_issues')
                .select(`
                    *,
                    workers (name, worker_code),
                    production_orders (
                        order_no,
                        styles (styleNo, buyerPO, season, stitchingRate)
                    )
                `)
                .eq('id', id)
                .single();

            if (error) {
                console.error(error);
                alert("Issue not found!");
                navigate('/stitching');
                return;
            }

            setIssue(issueData);

            const { data: itemData } = await supabase
                .from('stitching_issue_items')
                .select(`
                    *,
                    bundles (bundle_no, size, color, barcode)
                `)
                .eq('stitching_issue_id', id);

            setItems(itemData || []);
            setLoading(false);
        };
        fetchDetails();
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="p-12 text-center text-sage-400 italic font-medium">Fetching issue details...</div>;
    if (!issue) return null;

    const po = Array.isArray(issue.production_orders) ? issue.production_orders[0] : issue.production_orders;
    const style = Array.isArray(po?.styles) ? po.styles[0] : po?.styles;
    const rate = style?.stitchingRate || style?.stitching_rate || '0.00';
    const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Header / Actions - Hidden on Print */}
            <div className="flex items-center justify-between mb-8 print:hidden">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/stitching')} className="p-2 hover:bg-sage-100 rounded-full transition-colors">
                        <ArrowLeft className="text-sage-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-sage-800">{issue.issue_no}</h1>
                        <p className="text-sage-500 text-sm">Issued to {issue.workers?.name}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-6 py-2.5 bg-sage-800 text-white rounded-xl hover:bg-sage-900 transition-all shadow-lg font-bold"
                    >
                        <Printer size={18} /> Print / PDF
                    </button>
                    <Link
                        to={`/stitching/issue/edit/${id}`}
                        state={{ editEntry: issue }}
                        className="px-6 py-2.5 bg-white border border-sage-200 text-sage-700 rounded-xl hover:bg-sage-50 transition-all font-bold"
                    >
                        Edit Issue
                    </Link>
                </div>
            </div>

            {/* Print Content Container */}
            <div className="bg-white rounded-3xl shadow-sm border border-sage-200 overflow-hidden print:shadow-none print:border-0 print-content">
                {/* Print Header */}
                <div className="bg-sage-50 p-8 border-b border-sage-100 flex justify-between items-start print:bg-white print:p-0 print:mb-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-sage-800 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                                <Scissors size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-sage-900 tracking-tight">MADAN CREATION</h2>
                                <p className="text-[10px] font-bold text-sage-500 uppercase tracking-[0.3em]">Cutting Issue Note</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm pt-2">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-sage-400 uppercase tracking-widest">Issue No</span>
                                <span className="font-black text-sage-800 font-mono underline decoration-sage-200">{issue.issue_no}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-sage-400 uppercase tracking-widest">Date</span>
                                <span className="font-black text-sage-800">{new Date(issue.issue_date).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-right space-y-2">
                        <div className="bg-white p-4 rounded-2xl border border-sage-200 print:border-black print:p-3">
                            <span className="block text-[10px] font-black text-sage-400 uppercase tracking-[0.2em] mb-1">Issue To (Worker)</span>
                            <span className="text-lg font-black text-sage-900">{issue.workers?.name}</span>
                            <span className="block text-xs font-bold text-sage-500">[{issue.workers?.worker_code}]</span>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-8 print:p-0">
                    {/* Order Details Grid */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="p-4 bg-sage-50/50 rounded-2xl border border-sage-100 print:bg-white print:border-black">
                            <span className="text-[9px] font-black text-sage-400 uppercase tracking-widest block mb-1">Production Order</span>
                            <span className="font-bold text-sage-800 text-sm">{po?.order_no}</span>
                        </div>
                        <div className="p-4 bg-sage-50/50 rounded-2xl border border-sage-100 print:bg-white print:border-black">
                            <span className="text-[9px] font-black text-sage-400 uppercase tracking-widest block mb-1">Style No</span>
                            <span className="font-bold text-sage-800 text-sm">{style?.styleNo}</span>
                        </div>
                        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 print:bg-white print:border-black">
                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-1">Buyer PO</span>
                            <span className="font-black text-blue-900 text-sm truncate">{style?.buyerPO || 'N/A'}</span>
                        </div>
                        <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 print:bg-white print:border-black">
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Stitching Rate</span>
                            <span className="font-black text-emerald-900 text-sm">₹ {rate}/Pcs</span>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black text-sage-800 uppercase tracking-wider flex items-center gap-2">
                            <Package size={16} className="text-sage-300" /> Bundle Breakdown
                        </h3>
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-sage-800 text-white print:bg-white print:text-black print:border-b-2 print:border-black">
                                    <th className="px-6 py-3 text-left rounded-l-xl print:rounded-none">Bundle No</th>
                                    <th className="px-6 py-3 text-left">Barcode</th>
                                    <th className="px-6 py-3 text-center">Size</th>
                                    <th className="px-6 py-3 text-center">Color</th>
                                    <th className="px-6 py-3 text-right rounded-r-xl print:rounded-none">Qty (Pcs)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-sage-100 print:divide-black">
                                {items.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-sage-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold text-sage-800">{item.bundles?.bundle_no}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-sage-500">{item.bundles?.barcode}</td>
                                        <td className="px-6 py-4 text-center font-black">{item.bundles?.size}</td>
                                        <td className="px-6 py-4 text-center text-sage-600">{item.bundles?.color}</td>
                                        <td className="px-6 py-4 text-right font-black text-sage-900">{item.qty}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-sage-50 font-black print:bg-white print:border-t-2 print:border-black text-lg">
                                    <td colSpan={4} className="px-6 py-4 text-right text-sage-500 tracking-widest uppercase text-xs">Total Issued Pieces</td>
                                    <td className="px-6 py-4 text-right text-sage-900 underline decoration-double decoration-sage-300">{totalQty} PCS</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Remarks & Signatures */}
                    <div className="grid grid-cols-2 gap-12 pt-8">
                        <div className="space-y-3">
                            <span className="text-[10px] font-black text-sage-400 uppercase tracking-widest">Remarks</span>
                            <div className="p-4 bg-sage-50/50 rounded-2xl border border-sage-100 min-h-[100px] text-sm text-sage-600 italic print:p-0 print:border-0 print:bg-white">
                                {issue.remarks || 'No specific remarks.'}
                            </div>
                        </div>

                        <div className="flex flex-col justify-end space-y-12">
                            <div className="flex justify-between gap-8">
                                <div className="flex-1 border-t-2 border-sage-200 mt-12 text-center pt-2">
                                    <span className="text-[10px] font-black text-sage-400 uppercase tracking-widest">Issuer Signature</span>
                                </div>
                                <div className="flex-1 border-t-2 border-sage-200 mt-12 text-center pt-2">
                                    <span className="text-[10px] font-black text-sage-400 uppercase tracking-widest">Worker Signature</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Print Footer */}
                <div className="p-4 bg-sage-50 text-center text-[8px] font-bold text-sage-400 uppercase tracking-[0.4em] print:bg-white print:mt-12 print:border-t print:p-2">
                    System Generated Issue Note • Madan Creation ERP
                </div>
            </div>

            {/* Print Custom Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    body * { visibility: hidden; }
                    .print-content, .print-content * { visibility: visible; }
                    .print-content { position: absolute; left: 0; top: 0; width: 100%; border: none !important; }
                    @page { margin: 1cm; size: auto; }
                    button, .print-hidden { display: none !important; }
                }
            `}} />
        </div>
    );
};

// Re-wrap the body content of StitchingIssueDetails in a div with className="print-content" for the print style to work effectively.
// For simplicity, I will use a direct print-target on the main wrapper.

export default StitchingIssueDetails;
