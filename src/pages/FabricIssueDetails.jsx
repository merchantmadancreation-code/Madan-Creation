import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Printer, Calendar, Hash, FileText, CheckCircle, Clock, Package } from 'lucide-react';
import { format } from 'date-fns';

const FabricIssueDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [issue, setIssue] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('fabric_issues')
                .select('*, fabric_issue_items(*)')
                .eq('id', id)
                .single();

            if (error) {
                console.error("Error fetching fabric issue:", error);
                alert("Failed to load fabric issue details.");
                navigate('/cutting/fabric-issue');
            } else {
                setIssue(data);
            }
            setLoading(false);
        };

        if (id) fetchDetails();
    }, [id, navigate]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="p-12 text-center text-sage-500 italic">Loading issue details...</div>;
    if (!issue) return <div className="p-12 text-center text-red-500 font-bold">Issue not found.</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12 print:p-0 print:m-0">
            {/* Header */}
            <div className="flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/cutting/fabric-issue')} className="p-2 hover:bg-sage-100 rounded-full transition-colors">
                        <ArrowLeft className="text-sage-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-sage-800">Fabric Issue Details</h1>
                        <p className="text-sage-500 text-sm">{issue.issue_no}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-5 py-2.5 bg-sage-100 text-sage-700 rounded-xl hover:bg-sage-200 transition-colors font-bold"
                    >
                        <Printer size={18} /> Print
                    </button>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block text-center border-b-2 border-sage-800 pb-6 mb-8">
                <h1 className="text-3xl font-black text-sage-900 tracking-tighter uppercase">Fabric Issue Note</h1>
                <p className="text-sage-600 mt-2 font-bold font-mono text-lg">{issue.issue_no}</p>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-200 print:shadow-none print:border-sage-400">
                    <h3 className="text-xs font-black text-sage-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Hash size={14} /> Basic Info
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] text-sage-500 uppercase font-bold mb-1">Issue No</p>
                                <p className="font-mono font-bold text-sage-800">{issue.issue_no}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-sage-500 uppercase font-bold mb-1">Date</p>
                                <p className="font-bold text-sage-800 flex items-center gap-1.5">
                                    <Calendar size={14} className="text-sage-400" />
                                    {format(new Date(issue.created_at), 'dd MMM yyyy, HH:mm')}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-sage-100">
                            <div>
                                <p className="text-[10px] text-sage-500 uppercase font-bold mb-1">Status</p>
                                <div className="inline-flex">
                                    {issue.status === 'Received' ? (
                                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold uppercase tracking-wide">
                                            <CheckCircle size={14} /> Received
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold uppercase tracking-wide">
                                            <Clock size={14} /> {issue.status}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-200 print:shadow-none print:border-sage-400">
                    <h3 className="text-xs font-black text-sage-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <FileText size={14} /> Production Mapping
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] text-sage-500 uppercase font-bold mb-1">Style No</p>
                                <p className="font-bold text-sage-800">{issue.style_no || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-sage-500 uppercase font-bold mb-1">Buyer PO</p>
                                <p className="font-bold text-sage-800">{issue.buyer_po || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="pt-3 border-t border-sage-100">
                            <p className="text-[10px] text-sage-500 uppercase font-bold mb-1">Remarks</p>
                            <p className="text-sm text-sage-700 italic">{issue.remarks || 'No remarks provided.'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-sage-200 overflow-hidden print:shadow-none print:border-sage-400">
                <div className="p-4 border-b border-sage-100 bg-sage-50/50 flex items-center gap-2">
                    <Package size={18} className="text-sage-500" />
                    <h3 className="font-bold text-sage-800 uppercase tracking-wider text-sm">Issued Fabric Details</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-sage-50 text-[10px] font-bold text-sage-500 uppercase tracking-widest border-b border-sage-200">
                            <tr>
                                <th className="px-6 py-4">Fabric Name</th>
                                <th className="px-6 py-4 w-40">Roll / Bale No</th>
                                <th className="px-6 py-4 w-32 text-right">Quantity</th>
                                <th className="px-6 py-4 w-24 text-center">Unit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sage-100">
                            {issue.fabric_issue_items && issue.fabric_issue_items.length > 0 ? (
                                issue.fabric_issue_items.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-sage-50/30 transition-colors">
                                        <td className="px-6 py-4 font-bold text-sage-800">{item.item_name}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-sage-100 text-sage-700 rounded text-xs font-mono font-bold">
                                                {item.roll_no || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-sage-900">
                                            {item.quantity.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-[10px] uppercase font-bold text-sage-500 tracking-wider">
                                                {item.unit}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-sage-400 italic">No items found in this issue.</td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-sage-50 font-bold border-t-2 border-sage-200 text-sage-900">
                            <tr>
                                <td colSpan="2" className="px-6 py-4 text-right uppercase text-xs">Total Issued:</td>
                                <td className="px-6 py-4 text-right text-lg">
                                    {(issue.fabric_issue_items?.reduce((sum, i) => sum + (parseFloat(i.quantity) || 0), 0) || 0).toFixed(2)}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Print Footer Details */}
            <div className="hidden print:flex justify-between items-end mt-24 pt-8 border-t border-sage-300">
                <div className="text-center">
                    <div className="w-48 border-b border-sage-800 mb-2"></div>
                    <p className="text-xs font-bold text-sage-600 uppercase">Issued By (Stores)</p>
                </div>
                <div className="text-center">
                    <div className="w-48 border-b border-sage-800 mb-2"></div>
                    <p className="text-xs font-bold text-sage-600 uppercase">Received By (Cutting)</p>
                </div>
            </div>
        </div>
    );
};

export default FabricIssueDetails;
