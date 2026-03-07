import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Search, FileText, Calendar, User, Package, Printer, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const MaterialIssueList = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [issues, setIssues] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchIssues();
    }, []);

    const fetchIssues = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('material_issues')
            .select('*, worker:workers(name, worker_code), order:production_orders(order_no, styles(styleNo))')
            .order('created_at', { ascending: false });

        if (error) console.error("Error fetching issues:", error);
        else setIssues(data || []);
        setLoading(false);
    };

    const filteredIssues = issues.filter(issue =>
        issue.issue_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.worker?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.order?.order_no.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-sage-800">Material Issues</h1>
                    <p className="text-sage-500 text-sm">History of trims & accessories issued to workers</p>
                </div>
                <button
                    onClick={() => navigate('/production/material-issues/new')}
                    className="flex items-center gap-2 px-6 py-2.5 bg-sage-800 text-white rounded-xl hover:bg-sage-900 transition-all font-bold shadow-lg"
                >
                    <Plus size={18} /> New Material Issue
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-sage-200 overflow-hidden">
                <div className="p-4 border-b border-sage-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-sage-50/30">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by issue no, worker, or order..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-sage-200 rounded-xl text-sm focus:ring-2 focus:ring-sage-500/20 transition-all outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-sage-400">
                        <span className="bg-white px-3 py-1.5 rounded-lg border border-sage-200">
                            Total: {filteredIssues.length}
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-sage-50/50 text-[10px] font-bold text-sage-400 uppercase tracking-widest border-b border-sage-100">
                            <tr>
                                <th className="px-6 py-4">Issue Details</th>
                                <th className="px-6 py-4">Worker / Order</th>
                                <th className="px-6 py-4">Items Count</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sage-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-sage-400 italic">Loading issues...</td>
                                </tr>
                            ) : filteredIssues.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-sage-400 italic">No material issues found</td>
                                </tr>
                            ) : (
                                filteredIssues.map((issue) => (
                                    <tr key={issue.id} className="hover:bg-sage-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-mono font-bold text-sage-800">{issue.issue_no}</span>
                                                <div className="flex items-center gap-1.5 text-xs text-sage-400 mt-1">
                                                    <Calendar size={12} />
                                                    {format(new Date(issue.issue_date), 'dd MMM yyyy')}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <User size={14} className="text-sage-400" />
                                                    <span className="font-bold text-sage-700">{issue.worker?.name}</span>
                                                </div>
                                                {issue.order && (
                                                    <div className="flex items-center gap-2">
                                                        <Package size={14} className="text-sage-300" />
                                                        <span className="text-xs text-sage-500">{issue.order.order_no} ({issue.order.styles?.styleNo})</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[10px] font-black uppercase tracking-tighter">
                                                {/* In a real implementation we'd probably count items in the query or fetch separately, 
                                                    for now we assume 1+ if it's there or we could optimize the select */}
                                                Material Issue
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => navigate(`/production/material-issues/${issue.id}/details`)}
                                                    className="p-2 text-sage-500 hover:bg-sage-100 rounded-lg transition-all"
                                                    title="View Detail"
                                                >
                                                    <FileText size={18} />
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/production/material-issues/edit/${issue.id}`)}
                                                    className="p-2 text-sage-500 hover:bg-sage-100 rounded-lg transition-all"
                                                    title="Edit"
                                                >
                                                    <ChevronRight size={18} />
                                                </button>
                                            </div>
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

export default MaterialIssueList;
