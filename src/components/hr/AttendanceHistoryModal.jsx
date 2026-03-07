import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Download, Calendar, User, Clock, FileSpreadsheet, ChevronDown, ChevronRight, History, RefreshCw } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';

const AttendanceHistoryModal = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [attendanceData, setAttendanceData] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [expandedEmps, setExpandedEmps] = useState({});
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ status: '', check_in: '', check_out: '' });

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen, startDate, endDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch all employees first
            const { data: emps, error: empError } = await supabase
                .from('hr_employees')
                .select('id, name, emp_id, department')
                .eq('status', 'Active')
                .order('name');

            if (empError) throw empError;
            setEmployees(emps || []);

            // Fetch attendance for range
            const { data: att, error: attError } = await supabase
                .from('hr_attendance')
                .select('*, hr_employees(name, emp_id)')
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: false });

            if (attError) throw attError;
            setAttendanceData(att || []);
        } catch (err) {
            console.error("Error fetching attendance history:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditStart = (log) => {
        setEditingId(log.id);
        setEditForm({
            status: log.status,
            check_in: log.check_in ? format(new Date(log.check_in), "yyyy-MM-dd'T'HH:mm") : '',
            check_out: log.check_out ? format(new Date(log.check_out), "yyyy-MM-dd'T'HH:mm") : ''
        });
    };

    const handleUpdate = async (logId) => {
        setLoading(true);
        try {
            // Convert local input strings back to UTC ISO for storage
            const checkInIso = editForm.check_in ? new Date(editForm.check_in).toISOString() : null;
            const checkOutIso = editForm.check_out ? new Date(editForm.check_out).toISOString() : null;

            const { error } = await supabase
                .from('hr_attendance')
                .update({
                    status: editForm.status,
                    check_in: checkInIso,
                    check_out: checkOutIso
                })
                .eq('id', logId);

            if (error) throw error;
            setEditingId(null);
            fetchData();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (empId) => {
        setExpandedEmps(prev => ({ ...prev, [empId]: !prev[empId] }));
    };

    const exportToExcel = () => {
        const days = eachDayOfInterval({
            start: new Date(startDate),
            end: new Date(endDate)
        });

        const exportData = employees.map(emp => {
            const row = {
                'Employee ID': emp.emp_id,
                'Employee Name': emp.name,
                'Department': emp.department || 'N/A'
            };

            days.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const records = attendanceData.filter(a => a.employee_id === emp.id && a.date === dateStr);

                if (records.length > 0) {
                    const checkIn = records[0].check_in ? format(new Date(records[0].check_in), 'hh:mm a') : '-';
                    const checkOut = records[0].check_out ? format(new Date(records[0].check_out), 'hh:mm a') : '-';
                    row[format(day, 'dd-MMM')] = `${checkIn} to ${checkOut}`;
                } else {
                    row[format(day, 'dd-MMM')] = 'Absent';
                }
            });

            return row;
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
        XLSX.writeFile(wb, `Attendance_Report_${startDate}_to_${endDate}.xlsx`);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-sage-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative z-10 w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-sage-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-sage-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-sage-900 flex items-center gap-3">
                            <History size={24} className="text-sage-500" />
                            Attendance History
                        </h2>
                        <p className="text-[10px] font-bold text-sage-400 uppercase tracking-[0.2em] mt-1">Detailed employee logs & reports</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={exportToExcel}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                        >
                            <FileSpreadsheet size={18} />
                            Export Excel
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-sage-100 rounded-full transition-colors text-sage-400">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-4 bg-white border-b border-sage-50 flex flex-wrap items-center gap-4 shadow-sm relative z-20">
                    <div className="flex items-center gap-3 bg-sage-50 px-4 py-2 rounded-xl border border-sage-100">
                        <Calendar size={16} className="text-sage-400" />
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent text-xs font-bold text-sage-600 focus:outline-none"
                            />
                            <span className="text-sage-300 font-bold">to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent text-xs font-bold text-sage-600 focus:outline-none"
                            />
                        </div>
                    </div>
                    {loading && <RefreshCw size={16} className="text-sage-400 animate-spin" />}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-sage-50/20">
                    {loading && !attendanceData.length ? (
                        <div className="h-full flex flex-col items-center justify-center text-sage-400 py-20">
                            <div className="w-12 h-12 border-4 border-sage-100 border-t-sage-500 rounded-full animate-spin mb-4" />
                            <p className="text-sm font-bold uppercase tracking-widest italic">Gathering logs...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {employees.map(emp => {
                                const empAttendance = attendanceData.filter(a => a.employee_id === emp.id);
                                const isExpanded = expandedEmps[emp.id];

                                return (
                                    <div key={emp.id} className="bg-white rounded-2xl border border-sage-100 shadow-sm overflow-hidden transition-all hover:border-sage-200">
                                        <div
                                            onClick={() => toggleExpand(emp.id)}
                                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-sage-50/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-sage-100 flex items-center justify-center text-sage-500 shadow-inner">
                                                    <User size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-sage-900 text-sm italic">{emp.name}</h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] font-bold text-sage-400 uppercase tracking-widest">{emp.emp_id}</span>
                                                        <span className="w-1 h-1 bg-sage-200 rounded-full" />
                                                        <span className="text-[10px] font-bold text-sage-500 uppercase tracking-widest italic">{emp.department || 'No Dept'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <div className="text-[9px] font-black text-sage-400 uppercase tracking-tighter">Sessions Found</div>
                                                    <div className="text-sm font-black text-sage-800">{empAttendance.length} Days</div>
                                                </div>
                                                {isExpanded ? <ChevronDown className="text-sage-400" /> : <ChevronRight className="text-sage-400" />}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="border-t border-sage-50 bg-sage-50/20">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left bg-white">
                                                        <thead className="bg-sage-50/50">
                                                            <tr>
                                                                <th className="px-6 py-3 text-[10px] font-black text-sage-400 uppercase tracking-widest">Date</th>
                                                                <th className="px-6 py-3 text-[10px] font-black text-sage-400 uppercase tracking-widest">Clock In</th>
                                                                <th className="px-6 py-3 text-[10px] font-black text-sage-400 uppercase tracking-widest">Clock Out</th>
                                                                <th className="px-6 py-3 text-[10px] font-black text-sage-400 uppercase tracking-widest">Status</th>
                                                                <th className="px-6 py-3 text-[10px] font-black text-sage-400 uppercase tracking-widest text-right">Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-sage-50">
                                                            {empAttendance.length > 0 ? (
                                                                empAttendance.map(log => (
                                                                    <tr key={log.id} className="hover:bg-sage-50/30 transition-colors">
                                                                        <td className="px-6 py-4">
                                                                            <div className="text-xs font-bold text-sage-700">{format(parseISO(log.date), 'dd MMM yyyy, EEE')}</div>
                                                                        </td>
                                                                        <td className="px-6 py-4">
                                                                            {editingId === log.id ? (
                                                                                <input
                                                                                    type="datetime-local"
                                                                                    value={editForm.check_in}
                                                                                    onChange={(e) => setEditForm(prev => ({ ...prev, check_in: e.target.value }))}
                                                                                    className="text-[10px] font-bold border border-sage-200 rounded p-1 bg-white focus:outline-none focus:border-sage-500"
                                                                                />
                                                                            ) : (
                                                                                <div className="flex items-center gap-2 text-emerald-600">
                                                                                    <Clock size={12} />
                                                                                    <span className="text-xs font-black">{log.check_in ? format(new Date(log.check_in), 'hh:mm a') : '--:--'}</span>
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-6 py-4">
                                                                            {editingId === log.id ? (
                                                                                <input
                                                                                    type="datetime-local"
                                                                                    value={editForm.check_out}
                                                                                    onChange={(e) => setEditForm(prev => ({ ...prev, check_out: e.target.value }))}
                                                                                    className="text-[10px] font-bold border border-sage-200 rounded p-1 bg-white focus:outline-none focus:border-sage-500"
                                                                                />
                                                                            ) : (
                                                                                <div className="flex items-center gap-2 text-sage-500">
                                                                                    <Clock size={12} />
                                                                                    <span className="text-xs font-black">{log.check_out ? format(new Date(log.check_out), 'hh:mm a') : '--:--'}</span>
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-6 py-4">
                                                                            {editingId === log.id ? (
                                                                                <select
                                                                                    value={editForm.status}
                                                                                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                                                                                    className="text-[10px] font-bold border border-sage-200 rounded p-1 bg-white focus:outline-none focus:border-sage-500"
                                                                                >
                                                                                    <option value="Present">Present</option>
                                                                                    <option value="Half Day">Half Day</option>
                                                                                    <option value="Absent">Absent</option>
                                                                                </select>
                                                                            ) : (
                                                                                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${log.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                                                    }`}>
                                                                                    {log.status}
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-6 py-4 text-right">
                                                                            {editingId === log.id ? (
                                                                                <div className="flex items-center justify-end gap-2">
                                                                                    <button
                                                                                        onClick={() => handleUpdate(log.id)}
                                                                                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition-colors"
                                                                                    >
                                                                                        Save
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => setEditingId(null)}
                                                                                        className="px-3 py-1 bg-sage-100 text-sage-600 rounded-lg text-[10px] font-bold hover:bg-sage-200 transition-colors"
                                                                                    >
                                                                                        Cancel
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <button
                                                                                    onClick={() => handleEditStart(log)}
                                                                                    className="p-1.5 text-sage-400 hover:text-sage-900 hover:bg-sage-50 rounded-lg transition-all"
                                                                                    title="Correct Attendance"
                                                                                >
                                                                                    <RefreshCw size={14} className="hover:rotate-180 transition-all duration-500" />
                                                                                </button>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                            ) : (
                                                                <tr>
                                                                    <td colSpan="5" className="px-6 py-8 text-center text-xs font-medium text-sage-400 italic">
                                                                        No individual records found in this range.
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {employees.length === 0 && !loading && (
                                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-sage-200">
                                    <User size={48} className="text-sage-100 mx-auto mb-4" />
                                    <p className="text-sage-400 font-medium italic">No active employees found to display history.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttendanceHistoryModal;
