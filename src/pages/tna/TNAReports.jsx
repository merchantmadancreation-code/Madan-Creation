import React, { useMemo, useRef } from 'react';
import { useTNA } from '../../context/TNAContext';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowLeft, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { differenceInDays } from 'date-fns';

const TNAReports = () => {
    const { activePlans, loading } = useTNA();
    const reportRef = useRef();

    const handleExportPDF = async () => {
        if (!reportRef.current) return;
        try {
            const dataUrl = await toPng(reportRef.current, { cacheBust: true, pixelRatio: 2 });
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (reportRef.current.scrollHeight * pdfWidth) / reportRef.current.scrollWidth;

            pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`TNA_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error("Export failed:", error);
            alert(`PDF Export failed: ${error.message}`);
        }
    };

    const data = useMemo(() => {
        if (!activePlans.length) return { delayByDept: [], buyerPerformance: [] };

        // 1. Department Delay Analysis (Mocked logic as Dept isn't strictly in DB yet, deriving from Stage)
        const delayByStage = {};
        activePlans.forEach(plan => {
            plan.tna_plan_tasks.forEach(task => {
                if (new Date(task.planned_end_date) < new Date() && task.status !== 'Completed') {
                    const stage = task.stage || 'General';
                    const diff = differenceInDays(new Date(), new Date(task.planned_end_date));
                    delayByStage[stage] = (delayByStage[stage] || 0) + diff;
                }
            });
        });

        const delayChartData = Object.entries(delayByStage).map(([name, days]) => ({ name, days }));

        // 2. Buyer Performance (On-Time vs Delayed)
        const buyerStats = {};
        activePlans.forEach(plan => {
            const buyerName = plan.production_orders?.buyer?.name || 'Unknown Buyer';
            if (!buyerStats[buyerName]) buyerStats[buyerName] = { name: buyerName, onTime: 0, delayed: 0 };

            const isDelayed = plan.tna_plan_tasks.some(t => new Date(t.planned_end_date) < new Date() && t.status !== 'Completed');
            if (isDelayed) buyerStats[buyerName].delayed++;
            else buyerStats[buyerName].onTime++;
        });

        const buyerChartData = Object.values(buyerStats);

        return { delayByDept: delayChartData, buyerPerformance: buyerChartData };
    }, [activePlans]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    if (loading) return <div className="p-8 text-center">Loading Reports...</div>;

    return (
        <div ref={reportRef} className="space-y-6 animate-in fade-in duration-500 p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/tna" className="text-gray-500 hover:text-gray-700 bg-gray-100 p-2 rounded-lg">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-800">TNA Performance Reports</h1>
                </div>
                <button onClick={handleExportPDF} data-html2canvas-ignore="true" className="bg-sage-600 text-white px-4 py-2 rounded-lg hover:bg-sage-700 flex items-center gap-2">
                    <Download size={18} /> Export PDF
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Delay by Stage Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Cumulative Delays by Stage (Days)</h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.delayByDept}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="days" fill="#ef4444" name="Total Delay Days" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Buyer Performance Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Buyer On-Time Performance</h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.buyerPerformance}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="onTime" fill="#22c55e" name="On Time Orders" stackId="a" />
                                <Bar dataKey="delayed" fill="#facc15" name="Delayed Orders" stackId="a" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Detailed Delay Log</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan End</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delay</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {activePlans.flatMap(plan =>
                                plan.tna_plan_tasks
                                    .filter(t => new Date(t.planned_end_date) < new Date() && t.status !== 'Completed')
                                    .map(task => (
                                        <tr key={task.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{plan.production_orders?.order_no}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.task_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.stage || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{task.planned_end_date}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-bold">
                                                {differenceInDays(new Date(), new Date(task.planned_end_date))} days
                                            </td>
                                        </tr>
                                    ))
                            )}
                            {activePlans.every(p => !p.tna_plan_tasks.some(t => new Date(t.planned_end_date) < new Date() && t.status !== 'Completed')) && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No active delays found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TNAReports;
