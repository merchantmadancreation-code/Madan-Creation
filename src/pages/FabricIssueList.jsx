import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Search, FileText, Calendar, Package, ChevronRight, CheckCircle, Clock, Eye, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

const FabricIssueList = () => {
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
            .from('fabric_issues')
            .select('*, fabric_issue_items(*)')
            .order('created_at', { ascending: false });

        if (error) console.error("Error fetching fabric issues:", error);
        else setIssues(data || []);
        setLoading(false);
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this fabric issue?')) return;

        // Delete items first to avoid foreign key constraints
        await supabase.from('fabric_issue_items').delete().eq('fabric_issue_id', id);

        const { error } = await supabase.from('fabric_issues').delete().eq('id', id);
        if (error) {
            console.error("Error deleting issue:", error);
            alert("Failed to delete issue");
        } else {
            fetchIssues();
        }
    };

    const filteredIssues = issues.filter(issue =>
        issue.issue_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (issue.remarks && issue.remarks.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Received':
                return (
                    <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-md text-[10px] font-bold uppercase tracking-wider">
                        <CheckCircle size={12} /> Received
                    </span>
                );
            case 'Pending':
                return (
                    <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-[10px] font-bold uppercase tracking-wider">
                        <Clock size={12} /> Pending
                    </span>
                );
            default:
                return (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold uppercase tracking-wider">
                        {status}
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-sage-800">Fabric Issues</h1>
                    <p className="text-sage-500 text-sm">Manage fabric issued to the Cutting Department</p>
                </div>
                <button
                    onClick={() => navigate('/cutting/fabric-issue/new')}
                    className="flex items-center gap-2 px-6 py-2.5 bg-sage-800 text-white rounded-xl hover:bg-sage-900 transition-all font-bold shadow-lg"
                >
                    <Plus size={18} /> New Fabric Issue
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-sage-200 overflow-hidden">
                <div className="p-4 border-b border-sage-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-sage-50/30">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by issue no or remarks..."
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
                                <th className="px-6 py-4">Items</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Remarks</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sage-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-sage-400 italic">Loading fabric issues...</td>
                                </tr>
                            ) : filteredIssues.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-sage-400 italic">No fabric issues found</td>
                                </tr>
                            ) : (
                                filteredIssues.map((issue) => (
                                    <tr key={issue.id} className="hover:bg-sage-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-mono font-bold text-sage-800">{issue.issue_no}</span>
                                                <div className="flex items-center gap-1.5 text-xs text-sage-400 mt-1">
                                                    <Calendar size={12} />
                                                    {format(new Date(issue.created_at), 'dd MMM yyyy, HH:mm')}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Package size={14} className="text-sage-300" />
                                                <span className="font-bold text-sage-700">
                                                    {issue.fabric_issue_items?.length || 0} Items
                                                </span>
                                            </div>
                                            <div className="text-xs text-sage-400 mt-1 truncate max-w-[200px]">
                                                {issue.fabric_issue_items?.slice(0, 2).map(i => i.item_name).join(', ')}
                                                {issue.fabric_issue_items?.length > 2 && '...'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(issue.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sage-600 text-xs italic">
                                                {issue.remarks || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => navigate(`/cutting/fabric-issue/${issue.id}`)}
                                                    className="p-2 text-sage-500 hover:bg-sage-100 rounded-lg transition-all"
                                                    title="View Detail"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/cutting/fabric-issue/${issue.id}/edit`)}
                                                    className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-all"
                                                    title="Edit Issue"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(issue.id)}
                                                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-all"
                                                    title="Delete Issue"
                                                >
                                                    <Trash2 size={18} />
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

export default FabricIssueList;
