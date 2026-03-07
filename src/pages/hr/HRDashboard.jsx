import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Calendar, CreditCard, AlertCircle, Clock, CheckCircle, ChevronRight, UserMinus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const HRDashboard = () => {
    const [stats, setStats] = useState({
        totalEmployees: 0,
        todayAttendance: 0,
        absentToday: 0,
        monthlySalary: 0,
        activeEmployees: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const today = format(new Date(), 'yyyy-MM-dd');

            // 1. Total Employees
            const { count: totalCount } = await supabase
                .from('hr_employees')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'Active');

            const { data: attendanceToday } = await supabase
                .from('hr_attendance')
                .select('employee_id')
                .eq('date', today);

            const attendedCount = new Set(attendanceToday?.map(a => a.employee_id)).size;

            // 3. Absent Employees (Simple calculation)
            const absentCount = (totalCount || 0) - (attendedCount || 0);

            // 4. Monthly Salary Summary (Draft salaries for current month)
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            const { data: salaryData } = await supabase
                .from('hr_salaries')
                .select('total_salary')
                .eq('month', currentMonth)
                .eq('year', currentYear);

            const totalSal = salaryData?.reduce((sum, s) => sum + Number(s.total_salary), 0) || 0;

            // 5. Recent/Active Employees for display
            const { data: recentEmp } = await supabase
                .from('hr_employees')
                .select('*')
                .eq('status', 'Active')
                .limit(5);

            setStats({
                totalEmployees: totalCount || 0,
                todayAttendance: attendedCount || 0,
                absentToday: absentCount > 0 ? absentCount : 0,
                monthlySalary: totalSal,
                activeEmployees: recentEmp || []
            });
        } catch (error) {
            console.error('Error fetching HR stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const cards = [
        { label: 'Total Employees', value: stats.totalEmployees, sub: 'Active workforce', icon: <Users size={24} />, color: 'blue' },
        { label: 'Today Attendance', value: `${stats.todayAttendance}`, sub: `${((stats.todayAttendance / stats.totalEmployees) * 100 || 0).toFixed(1)}% Present`, icon: <CheckCircle size={24} />, color: 'emerald' },
        { label: 'Absent Today', value: stats.absentToday, sub: 'Action required', icon: <UserMinus size={24} />, color: 'red' },
        { label: 'Monthly Salary', value: `₹${stats.monthlySalary.toLocaleString()}`, sub: 'Draft totals', icon: <CreditCard size={24} />, color: 'amber' }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-slate-800">HR Command Center</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1 italic">Workforce Management & Analytics</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">{format(new Date(), 'dd MMMM yyyy')}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className={`w-12 h-12 rounded-xl bg-${card.color}-50 text-${card.color}-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                            {card.icon}
                        </div>
                        <div className="text-3xl font-black text-slate-800 mb-1">{card.value}</div>
                        <div className="text-sm font-bold text-slate-700">{card.label}</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{card.sub}</div>
                        <div className={`absolute top-0 right-0 p-4 opacity-5 text-${card.color}-900`}>
                            {card.icon}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Column 1 & 2: Main Actions & Recent List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link to="/hr/employees" className="group bg-blue-600 hover:bg-blue-700 p-6 rounded-2xl text-white shadow-lg transition-all hover:-translate-y-1">
                            <Users size={32} className="mb-4 text-blue-200" />
                            <h3 className="text-xl font-bold">Manage Employees</h3>
                            <p className="text-blue-100 text-xs mt-1">Add, screen, and manage staff profiles.</p>
                        </Link>
                        <Link to="/hr/attendance" className="group bg-slate-800 hover:bg-slate-900 p-6 rounded-2xl text-white shadow-lg transition-all hover:-translate-y-1">
                            <Clock size={32} className="mb-4 text-slate-400" />
                            <h3 className="text-xl font-bold">Attendance System</h3>
                            <p className="text-slate-400 text-xs mt-1">Biometric face-scrolling & logs.</p>
                        </Link>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                <Users size={16} className="text-blue-500" /> Workforce Preview
                            </h3>
                            <Link to="/hr/employees" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                                View All <ChevronRight size={14} />
                            </Link>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {stats.activeEmployees.map(emp => (
                                <div key={emp.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400">
                                            {emp.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 text-sm">{emp.name}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{emp.designation} • {emp.emp_id}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-slate-700">{emp.department}</div>
                                        <div className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Joining: {emp.joining_date}</div>
                                    </div>
                                </div>
                            ))}
                            {stats.activeEmployees.length === 0 && (
                                <div className="p-8 text-center text-slate-400 italic font-medium">No active employees found.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Column 3: Summary Sidebar */}
                <div className="space-y-6">
                    <Link to="/hr/salaries" className="block bg-amber-500 hover:bg-amber-600 p-6 rounded-2xl text-white shadow-lg transition-all">
                        <CreditCard size={32} className="mb-4 text-amber-200" />
                        <h3 className="text-xl font-bold">Salary Portal</h3>
                        <p className="text-amber-100 text-xs mt-1 text-balance">Automated calculations & monthly payouts.</p>
                        <div className="mt-4 flex items-center gap-2 text-xs font-bold">
                            Review Sheet <ChevronRight size={14} />
                        </div>
                    </Link>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                            <AlertCircle size={16} className="text-red-500" /> Compliance Alerts
                        </h3>
                        <div className="space-y-4">
                            <div className="flex gap-4 p-3 bg-red-50 rounded-xl border border-red-100">
                                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                                    <Clock size={16} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-red-800">Delayed Checkouts</div>
                                    <p className="text-[10px] text-red-600 mt-0.5">3 Employees haven't marked OUT yet.</p>
                                </div>
                            </div>
                            <div className="flex gap-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                    <Calendar size={16} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-blue-800">Upcoming Anniversary</div>
                                    <p className="text-[10px] text-blue-600 mt-0.5">Kapil Panwar completes 1 year tomorrow!</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HRDashboard;
