import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Clock, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

const CuttingFabricReceiving = () => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [issues, setIssues] = useState([]);
    const [expandedIssue, setExpandedIssue] = useState(null);
    const [processing, setProcessing] = useState(null);

    useEffect(() => {
        fetchPendingIssues();
    }, []);

    const fetchPendingIssues = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('fabric_issues')
            .select('*, fabric_issue_items(*)')
            .eq('status', 'Pending')
            .order('created_at', { ascending: false });

        if (error) console.error("Error fetching pending issues:", error);
        else setIssues(data || []);
        setLoading(false);
    };

    const handleReceive = async (issueId) => {
        if (!confirm("Are you sure you want to receive this fabric issue?")) return;

        setProcessing(issueId);
        try {
            const { error } = await supabase
                .from('fabric_issues')
                .update({ status: 'Received' })
                .eq('id', issueId);

            if (error) throw error;

            // Remove from list
            setIssues(prev => prev.filter(i => i.id !== issueId));
            alert("Fabric received successfully!");

        } catch (err) {
            console.error(err);
            alert(`Error receiving fabric: ${err.message}`);
        } finally {
            setProcessing(null);
        }
    };

    const toggleExpand = (id) => {
        setExpandedIssue(expandedIssue === id ? null : id);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-sage-800">Cutting Fabric Receiving</h1>
                <p className="text-sage-500 text-sm">Acknowledge receipt of fabric from Store</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-sage-200 overflow-hidden">
                <div className="p-4 border-b border-sage-100 bg-sage-50/30 flex justify-between items-center">
                    <h3 className="font-bold text-sage-800 text-sm uppercase tracking-wider flex items-center gap-2">
                        <Clock size={16} className="text-amber-500" /> Pending Receipts
                    </h3>
                    <span className="text-xs font-bold text-sage-500 bg-white px-2 py-1 rounded border border-sage-200">
                        {issues.length} Pending
                    </span>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-sage-400 italic">Loading pending issues...</div>
                ) : issues.length === 0 ? (
                    <div className="p-12 text-center text-sage-400 italic">
                        <div className="flex justify-center mb-4">
                            <CheckCircle size={48} className="text-sage-200" />
                        </div>
                        No pending fabric issues found. All clear!
                    </div>
                ) : (
                    <div className="divide-y divide-sage-100">
                        {issues.map(issue => (
                            <div key={issue.id} className="group">
                                <div
                                    className="p-4 hover:bg-sage-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                                    onClick={() => toggleExpand(issue.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                            <Package size={24} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sage-800">{issue.issue_no}</span>
                                                <span className="text-xs text-sage-400">• {format(new Date(issue.created_at), 'dd MMM, HH:mm')}</span>
                                            </div>
                                            <div className="text-sm text-sage-500">
                                                {issue.fabric_issue_items?.length} Items • <span className="italic">{issue.remarks || 'No remarks'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleReceive(issue.id);
                                            }}
                                            disabled={processing === issue.id}
                                            className="px-4 py-2 bg-sage-800 text-white rounded-lg hover:bg-sage-900 transition-all text-sm font-bold shadow-sm disabled:opacity-50"
                                        >
                                            {processing === issue.id ? 'Receiving...' : 'Receive Fabric'}
                                        </button>
                                        <div className="text-sage-400 transition-transform duration-200 transform group-hover:translate-x-1">
                                            {expandedIssue === issue.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedIssue === issue.id && (
                                    <div className="bg-sage-50/30 p-4 border-t border-sage-100 animation-expand">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-sage-100/50 text-[10px] font-bold text-sage-500 uppercase tracking-widest">
                                                <tr>
                                                    <th className="px-4 py-2 rounded-l-lg">Item Name</th>
                                                    <th className="px-4 py-2">Roll No</th>
                                                    <th className="px-4 py-2">Quantity</th>
                                                    <th className="px-4 py-2 rounded-r-lg">Unit</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-sage-100">
                                                {issue.fabric_issue_items?.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-4 py-2 font-medium text-sage-700">{item.item_name}</td>
                                                        <td className="px-4 py-2 text-sage-500 font-mono text-xs">{item.roll_no || '-'}</td>
                                                        <td className="px-4 py-2 font-bold text-sage-800">{item.quantity}</td>
                                                        <td className="px-4 py-2 text-sage-500 text-xs">{item.unit}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CuttingFabricReceiving;
