import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CreditCard, Calculator, FileText, Download, CheckCircle, Clock, AlertCircle, RefreshCw, ChevronRight, User, Edit, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDaysInMonth } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '../../context/AuthContext';

const SalaryCalculation = () => {
    const { isAdmin } = useAuth();
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [employees, setEmployees] = useState([]);
    const [salaries, setSalaries] = useState([]);
    const [calculating, setCalculating] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInitialData();
    }, [month, year]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const { data: empData, error: empError } = await supabase
                .from('hr_employees')
                .select('*')
                .eq('status', 'Active');

            if (empError) throw empError;

            const { data: salData, error: salError } = await supabase
                .from('hr_salaries')
                .select('*')
                .eq('month', month)
                .eq('year', year);

            if (salError) throw salError;

            setEmployees(empData || []);
            setSalaries(salData || []);
        } catch (error) {
            console.error("Fetch error:", error);
            alert(`Error fetching data: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const runCalculation = async () => {
        if (!employees.length) {
            alert("No active employees found to calculate salaries for.");
            return;
        }

        if (!confirm(`Are you sure you want to run salary calculations for ${format(new Date(year, month - 1), 'MMMM yyyy')}?`)) return;

        setCalculating(true);
        try {
            const firstDay = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
            const lastDay = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
            const totalDaysInMonth = getDaysInMonth(new Date(year, month - 1));

            console.log(`Running calculation for ${month}/${year}. Days: ${totalDaysInMonth}`);

            for (const emp of employees) {
                // 1. Fetch attendance for this employee in this month
                const { data: attendance, error: attError } = await supabase
                    .from('hr_attendance')
                    .select('*')
                    .eq('employee_id', emp.id)
                    .gte('date', firstDay)
                    .lte('date', lastDay);

                if (attError) throw attError;

                // Calculate weighted present days
                const presentCount = attendance ? attendance.filter(a => a.status === 'Present').length : 0;
                const halfDayCount = attendance ? attendance.filter(a => a.status === 'Half Day').length : 0;
                const weightedPresentDays = presentCount + (halfDayCount * 0.5);

                let calculatedSalary = 0;
                const baseSalary = Number(emp.base_salary) || 0;

                if (emp.salary_type === 'Monthly') {
                    // Formula: (Monthly Salary / Days in Month) * Present Days
                    calculatedSalary = (baseSalary / totalDaysInMonth) * weightedPresentDays;
                } else {
                    // Daily Rate * Present Days
                    calculatedSalary = baseSalary * weightedPresentDays;
                }

                console.log(`Emp: ${emp.name}, Days: ${weightedPresentDays}, Sal: ${calculatedSalary}`);

                // 2. Upsert to hr_salaries
                const { error: upsertError } = await supabase
                    .from('hr_salaries')
                    .upsert([{
                        employee_id: emp.id,
                        month: month,
                        year: year,
                        present_days: weightedPresentDays,
                        absent_days: totalDaysInMonth - weightedPresentDays,
                        total_salary: Math.round(calculatedSalary),
                        status: 'Draft'
                    }], { onConflict: 'employee_id,month,year' }); // No spaces in onConflict

                if (upsertError) {
                    console.error(`Upsert error for ${emp.name}:`, upsertError);
                    throw upsertError;
                }
            }
            alert('Calculations completed successfully!');
            fetchInitialData();
        } catch (error) {
            console.error("Calculation loop error:", error);
            alert(`Calculation failed: ${error.message}`);
        } finally {
            setCalculating(false);
        }
    };

    const approveSalary = async (id) => {
        const { error } = await supabase
            .from('hr_salaries')
            .update({ status: 'Approved', approved_at: new Date().toISOString() })
            .eq('id', id);
        if (error) alert(error.message);
        else fetchInitialData();
    };

    const adjustPresentDays = async (salId, currentDays) => {
        const newDays = prompt("Enter manual present days (use .5 for half days):", currentDays);
        if (newDays === null || newDays === "" || isNaN(newDays)) return;

        const sal = salaries.find(s => s.id === salId);
        const emp = employees.find(e => e.id === sal.employee_id);
        const totalDaysInMonth = getDaysInMonth(new Date(year, month - 1));

        let newSalary = 0;
        if (emp.salary_type === 'Monthly') {
            newSalary = (emp.base_salary / totalDaysInMonth) * parseFloat(newDays);
        } else {
            newSalary = emp.base_salary * parseFloat(newDays);
        }

        const { error } = await supabase
            .from('hr_salaries')
            .update({
                present_days: parseFloat(newDays),
                absent_days: totalDaysInMonth - parseFloat(newDays),
                total_salary: Math.round(newSalary)
            })
            .eq('id', salId);

        if (error) alert(error.message);
        else fetchInitialData();
    };

    const handleEditSalary = async (salId, currentDays, currentAmount) => {
        const newDaysStr = prompt("Enter manual present days (use .5 for half days):", currentDays);
        if (newDaysStr === null || newDaysStr === "" || isNaN(newDaysStr)) return;
        const newDays = parseFloat(newDaysStr);

        const newAmountStr = prompt("Enter new total salary amount:", currentAmount);
        if (newAmountStr === null || newAmountStr === "" || isNaN(newAmountStr)) return;
        const newAmount = parseFloat(newAmountStr);

        const totalDaysInMonth = getDaysInMonth(new Date(year, month - 1));

        const { error } = await supabase
            .from('hr_salaries')
            .update({
                present_days: newDays,
                absent_days: totalDaysInMonth - newDays,
                total_salary: Math.round(newAmount)
            })
            .eq('id', salId);

        if (error) alert(error.message);
        else fetchInitialData();
    };

    const handleDeleteSalary = async (salId) => {
        if (!confirm("Are you sure you want to delete this salary record?")) return;
        const { error } = await supabase
            .from('hr_salaries')
            .delete()
            .eq('id', salId);
        
        if (error) alert(error.message);
        else fetchInitialData();
    };

    const downloadSalarySlip = (sal) => {
        const emp = employees.find(e => e.id === sal.employee_id);
        const doc = new jsPDF();
        const monthName = format(new Date(year, month - 1), 'MMMM yyyy');

        // Header
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text('MADAN CREATION', 105, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // slate-400
        doc.text('SALARY SLIP - ' + monthName.toUpperCase(), 105, 28, { align: 'center' });

        doc.setDrawColor(226, 232, 240); // slate-200
        doc.line(20, 35, 190, 35);

        // Employee Info Table
        doc.autoTable({
            startY: 45,
            head: [['EMPLOYEE INFORMATION', '']],
            body: [
                ['Name', emp?.name || 'N/A'],
                ['Employee ID', emp?.emp_id || 'N/A'],
                ['Department', emp?.department || 'N/A'],
                ['Designation', emp?.designation || 'N/A'],
                ['Salary Type', emp?.salary_type || 'N/A']
            ],
            theme: 'plain',
            headStyles: { fillColor: [248, 250, 252], textColor: [71, 85, 105], fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3 }
        });

        // Attendance Table
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 10,
            head: [['ATTENDANCE SUMMARY', '']],
            body: [
                ['Total Days in Month', getDaysInMonth(new Date(year, month - 1))],
                ['Present Days', sal.present_days],
                ['Absent Days', sal.absent_days]
            ],
            theme: 'plain',
            headStyles: { fillColor: [248, 250, 252], textColor: [71, 85, 105], fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3 }
        });

        // Financials Table
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 10,
            head: [['EARNINGS & PAYABLES', 'AMOUNT (INR)']],
            body: [
                ['Basic / Monthly Scale', `Rs. ${Number(emp?.base_salary).toLocaleString()}`],
                ['Net Payable (Pro-rated)', `Rs. ${Number(sal.total_salary).toLocaleString()}`]
            ],
            theme: 'striped',
            headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
            bodyStyles: { fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 5 },
            columnStyles: { 1: { halign: 'right' } }
        });

        // Footer
        const finalY = doc.lastAutoTable.finalY + 30;
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text('This is a computer generated document and does not require a physical signature.', 105, finalY, { align: 'center' });

        doc.setDrawColor(226, 232, 240);
        doc.line(140, finalY - 10, 180, finalY - 10);
        doc.text('Authorized Signatory', 160, finalY - 5, { align: 'center' });

        doc.save(`Salary_Slip_${emp?.name.replace(/\s+/g, '_')}_${monthName.replace(/\s+/g, '_')}.pdf`);
    };

    return (
        <div className="space-y-6 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Salary Portal</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-0.5">Automated Payroll Calculation</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest"
                    >
                        {Array.from({ length: 12 }).map((_, i) => (
                            <option key={i + 1} value={i + 1}>{format(new Date(2026, i), 'MMMM')}</option>
                        ))}
                    </select>
                    <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest"
                    >
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                    </select>
                    <button
                        onClick={runCalculation}
                        disabled={calculating}
                        className="bg-slate-800 text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                        {calculating ? <RefreshCw size={14} className="animate-spin" /> : <Calculator size={14} />}
                        {calculating ? 'Processing...' : 'Run Calculations'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Structure</th>
                                <th className="px-6 py-4 text-center">Attendance</th>
                                <th className="px-6 py-4 text-right">Net Payable</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-20 text-center text-slate-400 italic">Finding records...</td></tr>
                            ) : salaries.map(sal => {
                                const emp = employees.find(e => e.id === sal.employee_id);
                                return (
                                    <tr key={sal.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{emp?.name}</div>
                                            <div className="text-[10px] text-slate-400 font-black uppercase">{emp?.emp_id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-slate-600 italic">{emp?.salary_type} Fixed</div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Base: ₹{emp?.base_salary}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex flex-col items-center">
                                                <div className="text-sm font-black text-slate-800">{sal.present_days} Days</div>
                                                <div className="text-[9px] text-red-400 font-bold uppercase tracking-widest">{sal.absent_days} Absent</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <div className="text-lg font-black text-slate-900 font-mono">₹{sal.total_salary.toLocaleString()}</div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter bg-slate-100 px-2 py-0.5 rounded-full mt-1">
                                                    (₹{emp?.base_salary?.toLocaleString()} / {getDaysInMonth(new Date(year, month - 1))}) × {sal.present_days}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {sal.status === 'Approved' ? (
                                                <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 w-fit mx-auto border border-emerald-100 italic">
                                                    <CheckCircle size={10} /> Approved
                                                </span>
                                            ) : (
                                                <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 w-fit mx-auto border border-amber-100 italic">
                                                    <Clock size={10} /> Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => downloadSalarySlip(sal)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Download Slip"
                                                >
                                                    <Download size={16} />
                                                </button>
                                                {sal.status !== 'Approved' && (
                                                    <>
                                                        <button
                                                            onClick={() => adjustPresentDays(sal.id, sal.present_days)}
                                                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                            title="Adjust Days"
                                                        >
                                                            <RefreshCw size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => approveSalary(sal.id)}
                                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all"
                                                        >
                                                            Approve
                                                        </button>
                                                    </>
                                                )}
                                                {isAdmin && sal.status === 'Approved' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleEditSalary(sal.id, sal.present_days, sal.total_salary)}
                                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Edit Salary"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteSalary(sal.id)}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete Salary"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {salaries.length === 0 && !loading && (
                                <tr><td colSpan="6" className="px-6 py-20 text-center text-slate-400">No salary records for this month. Click "Run Calculations" to start.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <FileText size={16} className="text-blue-500" /> Auto-Generated Stats
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                            <span className="text-xs font-bold text-slate-500">Total Net Payable</span>
                            <span className="text-lg font-black text-slate-900 font-mono">₹{salaries.reduce((sum, s) => sum + Number(s.total_salary), 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                            <span className="text-xs font-bold text-slate-500">Approved Payouts</span>
                            <span className="text-sm font-black text-emerald-600 font-mono">₹{salaries.filter(s => s.status === 'Approved').reduce((sum, s) => sum + Number(s.total_salary), 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-3xl shadow-lg text-white flex flex-col justify-center">
                    <h3 className="font-bold text-slate-300 text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                        <AlertCircle size={14} className="text-amber-500" /> Processing Guide
                    </h3>
                    <p className="text-slate-400 text-xs leading-relaxed italic">
                        Salaries are calculated based on registered attendance. Monthly fixed salaries are pro-rated based on days in the month. Ensure all attendance logs are verified before approval.
                    </p>
                    <div className="mt-4 flex gap-4">
                        <button className="text-[10px] font-black uppercase tracking-widest text-slate-200 hover:text-white flex items-center gap-1 underline underline-offset-4 decoration-slate-600">
                            Download Monthly Report <ChevronRight size={10} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalaryCalculation;
