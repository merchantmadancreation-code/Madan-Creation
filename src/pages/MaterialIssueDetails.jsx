import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Printer, Scissors, Calendar, User, Package, Box } from 'lucide-react';
import { format } from 'date-fns';
import logo from '../assets/logo.png';

const MaterialIssueDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [issue, setIssue] = useState(null);

    useEffect(() => {
        const fetchIssue = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('material_issues')
                .select(`
                    *,
                    worker:workers(name, worker_code),
                    order:production_orders(
                        order_no, 
                        total_qty,
                        styles(styleNo, color, buyerName)
                    ),
                    material_issue_items(*)
                `)
                .eq('id', id)
                .single();

            if (error) console.error("Error fetching issue:", error);
            else setIssue(data);
            setLoading(false);
        };
        fetchIssue();
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="p-12 text-center text-sage-400 italic">Loading issue details...</div>;
    if (!issue) return <div className="p-12 text-center text-red-400">Issue not found.</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/production/material-issues')} className="p-2 hover:bg-sage-100 rounded-full transition-colors">
                        <ArrowLeft className="text-sage-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-sage-800">Material Issue Note</h1>
                        <p className="text-sage-500 text-sm">Review and print material issue details</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(`/production/material-issues/edit/${id}`)}
                        className="px-4 py-2 bg-white border border-sage-200 text-sage-600 rounded-xl hover:bg-sage-50 transition-all font-bold text-sm"
                    >
                        Edit Issue
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-6 py-2 bg-sage-800 text-white rounded-xl hover:bg-sage-900 transition-all shadow-lg font-bold"
                    >
                        <Printer size={18} /> Print Note
                    </button>
                </div>
            </div>

            {/* Print Preview Area */}
            <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-sage-200 print:shadow-none print:border-none print:p-0">
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-sage-900 pb-6 mb-8">
                    <div className="flex items-center gap-4">
                        <img src={logo} alt="Madan Creation" className="w-16 h-16 object-contain" />
                        <div>
                            <h1 className="text-2xl font-black text-sage-900 tracking-tight">MADAN CREATION</h1>
                            <p className="text-xs font-bold text-sage-500 uppercase tracking-widest">Material Issue Note</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-mono font-black text-sage-900">{issue.issue_no}</div>
                        <div className="text-sm font-bold text-sage-400 uppercase">{format(new Date(issue.issue_date), 'dd MMMM yyyy')}</div>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-sage-400 uppercase tracking-widest block mb-1">Issued To (Worker)</label>
                            <div className="flex items-center gap-3 bg-sage-50 p-3 rounded-xl border border-sage-100">
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                    <User size={20} className="text-sage-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-sage-900">{issue.worker?.name}</p>
                                    <p className="text-xs font-mono text-sage-500">{issue.worker?.worker_code}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-sage-400 uppercase tracking-widest block mb-1">Production Details</label>
                            <div className="bg-sage-50 p-3 rounded-xl border border-sage-100 space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-sage-500 font-medium">Order No:</span>
                                    <span className="font-bold text-sage-900">{issue.order?.order_no || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-sage-500 font-medium">Style No:</span>
                                    <span className="font-bold text-sage-900">{issue.order?.styles?.styleNo || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-sage-500 font-medium">Buyer:</span>
                                    <span className="font-bold text-sage-900">{issue.order?.styles?.buyerName || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-8">
                    <label className="text-[10px] font-black text-sage-400 uppercase tracking-widest block mb-1">Issued Materials</label>
                    <div className="overflow-hidden border border-sage-200 rounded-xl">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-sage-900 text-white font-bold uppercase text-[10px]">
                                <tr>
                                    <th className="px-6 py-3 w-16 text-center">Sr.</th>
                                    <th className="px-6 py-3">Item Description</th>
                                    <th className="px-6 py-3 text-right">Quantity</th>
                                    <th className="px-6 py-3 w-24">Unit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-sage-100">
                                {issue.material_issue_items?.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td className="px-6 py-3 text-center font-bold text-sage-400">{idx + 1}</td>
                                        <td className="px-6 py-3 font-bold text-sage-800 uppercase text-xs">{item.item_name}</td>
                                        <td className="px-6 py-3 text-right font-black text-sage-900 text-base">{item.qty}</td>
                                        <td className="px-6 py-3 font-bold text-sage-500">{item.unit || 'Pcs'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Remarks & Footer */}
                <div className="grid grid-cols-2 gap-12 pt-8">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-sage-400 uppercase tracking-widest block mb-1">Remarks</label>
                            <div className="bg-sage-50 p-4 rounded-xl border border-sage-100 text-sm text-sage-600 min-h-[80px]">
                                {issue.remarks || 'No remarks provided.'}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col justify-end space-y-12">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="space-y-4">
                                <div className="h-px bg-sage-200" />
                                <p className="text-[10px] font-black text-sage-400 uppercase tracking-widest">Worker Signature</p>
                            </div>
                            <div className="space-y-4">
                                <div className="h-px bg-sage-200" />
                                <p className="text-[10px] font-black text-sage-400 uppercase tracking-widest">Authorized Signatory</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-6 border-t border-sage-100 flex justify-between items-center text-[10px] font-bold text-sage-300 uppercase tracking-[0.2em] no-print">
                    <span>Generated by Madan Creation ERP</span>
                    <span>{format(new Date(), 'dd-MM-yyyy HH:mm')}</span>
                </div>
            </div>
        </div>
    );
};

export default MaterialIssueDetails;
