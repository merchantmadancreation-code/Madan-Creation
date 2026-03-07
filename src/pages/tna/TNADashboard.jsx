import React, { useMemo } from 'react';
import { useTNA } from '../../context/TNAContext';
import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import {
    Clock, CheckCircle, AlertCircle, Plus, ChevronRight,
    BarChart2, TrendingUp, AlertTriangle, Activity
} from 'lucide-react';

const TNADashboard = () => {
    const { activePlans, loading } = useTNA();

    // --- KPI Calculations ---
    const stats = useMemo(() => {
        if (!activePlans.length) return {
            onTimeRate: 0,
            avgDelay: 0,
            criticalCount: 0,
            riskCount: 0,
            totalActive: 0
        };

        let totalActive = activePlans.length;
        let delayedCount = 0;
        let riskCount = 0;
        let totalDelayDays = 0;
        let delayedPlansCount = 0; // For avg calculation

        activePlans.forEach(plan => {
            // Check Critical Delays (Red)
            const isCritical = plan.tna_plan_tasks.some(t =>
                new Date(t.planned_end_date) < new Date() && t.status !== 'Completed'
            );
            if (isCritical) {
                delayedCount++;
                // Calc max delay for this plan
                const lateTasks = plan.tna_plan_tasks.filter(t => new Date(t.planned_end_date) < new Date() && t.status !== 'Completed');
                if (lateTasks.length > 0) {
                    const maxDelay = Math.max(...lateTasks.map(t => differenceInDays(new Date(), new Date(t.planned_end_date))));
                    totalDelayDays += maxDelay;
                    delayedPlansCount++;
                }
            }

            // Check Risk (Yellow) - Due within 3 days
            const isRisk = !isCritical && plan.tna_plan_tasks.some(t => {
                const due = new Date(t.planned_end_date);
                const diff = differenceInDays(due, new Date());
                return diff >= 0 && diff <= 3 && t.status !== 'Completed';
            });
            if (isRisk) riskCount++;
        });

        const onTimeRate = totalActive > 0 ? ((totalActive - delayedCount) / totalActive) * 100 : 100;
        const avgDelay = delayedPlansCount > 0 ? Math.round(totalDelayDays / delayedPlansCount) : 0;

        return {
            onTimeRate: Math.round(onTimeRate),
            avgDelay,
            criticalCount: delayedCount,
            riskCount,
            totalActive
        };
    }, [activePlans]);

    if (loading) return <div className="p-12 text-center text-gray-500">Loading Dashboard...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">TNA Executive Dashboard</h1>
                    <p className="text-gray-500 mt-1">Export Order Processing Status & KPIs</p>
                </div>
                <div className="flex gap-3">
                    <Link to="/tna/templates" className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 shadow-sm font-medium">
                        Templates
                    </Link>
                    <Link to="/production-orders" className="bg-sage-800 text-white px-5 py-2 rounded-lg hover:bg-sage-900 flex items-center gap-2 shadow-md transform hover:-translate-y-0.5 transition-all">
                        <Plus size={18} /> New Plan
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* On-Time Delivery Rate */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 relative overflow-hidden group">
                    <div>
                        <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">On-Time Delivery Rate</div>
                        <div className="text-4xl font-extrabold text-gray-800 mt-2">{stats.onTimeRate}%</div>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2">
                        <div
                            className={`h-1.5 rounded-full ${stats.onTimeRate > 90 ? 'bg-green-500' : stats.onTimeRate > 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${stats.onTimeRate}%` }}
                        ></div>
                    </div>
                    <Activity className="absolute right-4 top-4 text-gray-100 w-16 h-16 group-hover:text-gray-50 transition-colors pointer-events-none" />
                </div>

                {/* Average Delay Days */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 relative overflow-hidden group">
                    <div>
                        <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Avg. Delay Days</div>
                        <div className="text-4xl font-extrabold text-red-600 mt-2">{stats.avgDelay} <span className="text-sm font-normal text-gray-400">days</span></div>
                    </div>
                    <div className="text-xs text-red-500 font-medium flex items-center gap-1">
                        <TrendingUp size={14} /> Impact on Lead Time
                    </div>
                    <Clock className="absolute right-4 top-4 text-red-50 w-16 h-16 group-hover:text-red-100 transition-colors pointer-events-none" />
                </div>

                {/* Critical Orders */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-l-4 border-red-500 h-32 relative overflow-hidden">
                    <div>
                        <div className="text-red-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                            <AlertCircle size={14} /> Critical At Risk
                        </div>
                        <div className="text-4xl font-extrabold text-gray-800 mt-2">{stats.criticalCount} <span className="text-sm font-normal text-gray-400">orders</span></div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Require immediate attention</div>
                </div>

                {/* Active Orders */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-32 relative overflow-hidden">
                    <div>
                        <div className="text-blue-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                            <BarChart2 size={14} /> Total Active
                        </div>
                        <div className="text-4xl font-extrabold text-gray-800 mt-2">{stats.totalActive}</div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">In pipeline</div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left: Active Orders List */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2">
                            <CheckCircle className="text-green-600" size={18} /> Active Order Status
                        </h2>
                        <button className="text-sm text-sage-600 hover:text-sage-800 font-medium">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3">Order / Buyer</th>
                                    <th className="px-6 py-3">Style</th>
                                    <th className="px-6 py-3">Delivery</th>
                                    <th className="px-6 py-3">Phases</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {activePlans.map(plan => {
                                    const total = plan.tna_plan_tasks.length;
                                    const done = plan.tna_plan_tasks.filter(t => t.status === 'Completed').length;
                                    const progress = total ? Math.round((done / total) * 100) : 0;
                                    const isCritical = plan.tna_plan_tasks.some(t => new Date(t.planned_end_date) < new Date() && t.status !== 'Completed');

                                    return (
                                        <tr key={plan.id} className="hover:bg-gray-50 group">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-800">{plan.production_orders?.order_no}</div>
                                                <div className="text-xs text-gray-500">Buyer: {plan.production_orders?.buyer?.name || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded textxs font-mono">
                                                        {plan.production_orders?.style?.styleNo || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`font-medium ${isCritical ? 'text-red-600' : 'text-gray-700'}`}>
                                                    {format(new Date(plan.delivery_date), 'dd MMM')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 w-32">
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-xs text-gray-500">
                                                        <span>Progress</span>
                                                        <span>{progress}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                                                        <div
                                                            className={`h-1.5 rounded-full ${isCritical ? 'bg-red-500' : 'bg-green-500'}`}
                                                            style={{ width: `${progress}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link to={`/tna/${plan.id}`} className="p-2 bg-white border border-gray-200 rounded-lg hover:border-sage-500 hover:text-sage-600 inline-block transition-colors">
                                                    <ChevronRight size={16} />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right: Risk Monitor & Alerts */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-l-4 border-yellow-400 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <AlertTriangle className="text-yellow-500" size={18} /> Risk Monitor
                            </h3>
                            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-bold">{stats.riskCount}</span>
                        </div>
                        <div className="p-4">
                            {stats.riskCount === 0 ? (
                                <div className="text-center py-6 text-gray-400 text-sm">No orders at immediate risk.</div>
                            ) : (
                                <ul className="space-y-3">
                                    {activePlans
                                        .filter(p => !p.isCritical && p.tna_plan_tasks.some(t => {
                                            const due = new Date(t.planned_end_date);
                                            const diff = differenceInDays(due, new Date());
                                            return diff >= 0 && diff <= 3 && t.status !== 'Completed';
                                        }))
                                        .slice(0, 5) // Show top 5 risky
                                        .map(p => (
                                            <li key={p.id} className="text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                                                <div className="flex justify-between">
                                                    <span className="font-medium text-gray-700">{p.production_orders?.order_no}</span>
                                                    <span className="text-xs text-yellow-600 font-bold">Due Soon</span>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Task: {p.tna_plan_tasks.find(t => {
                                                        const due = new Date(t.planned_end_date);
                                                        const diff = differenceInDays(due, new Date());
                                                        return diff >= 0 && diff <= 3 && t.status !== 'Completed';
                                                    })?.task_name || 'Various'}
                                                </div>
                                            </li>
                                        ))
                                    }
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="bg-sage-900 rounded-2xl p-6 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="font-bold text-lg mb-2">Export Performance</h3>
                            <p className="text-sage-200 text-sm mb-4">You are maintaining a {stats.onTimeRate}% on-time delivery rate this month.</p>
                            <Link to="/tna/reports" className="bg-white text-sage-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-sage-50 transition-colors inline-block">
                                View Detailed Report
                            </Link>
                        </div>
                        <Activity className="absolute -right-4 -bottom-4 text-sage-800 w-32 h-32 opacity-50" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TNADashboard;
