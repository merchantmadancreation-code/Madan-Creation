import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTNA } from '../../context/TNAContext';
import { supabase } from '../../lib/supabase';
import TNATaskList from '../../components/tna/TNATaskList';
import TNAGanttChart from '../../components/tna/TNAGanttChart';
import { ArrowLeft, Clock, Calendar, User, Layers, Scissors, Truck, Activity, Save } from 'lucide-react';
import { format } from 'date-fns';

const TNAPlanDetails = () => {
    const { id } = useParams();
    const { updateTaskStatus, regenerateTasks } = useTNA();
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [activeTab, setActiveTab] = useState('list'); // 'list' or 'gantt'

    const fetchPlanDetails = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('tna_plans')
            .select(`
                *,
                production_orders (
                    order_no, 
                    buyer:buyers(name), 
                    style:styles("styleNo"), 
                    quantity_breakdown, 
                    total_qty
                ),
                tna_plan_tasks (*)
            `)
            .eq('id', id)
            .single();

        if (error) console.error("Error fetching plan:", error);
        else setPlan(data);
        setLoading(false);
    };

    useEffect(() => {
        if (id) fetchPlanDetails();
    }, [id]);

    const handleRegenerate = async () => {
        if (!plan) return;
        const confirmed = window.confirm("Are you sure? This will recreate all tasks for this plan based on the original template.");
        if (!confirmed) return;

        setSyncing(true);
        const success = await regenerateTasks(plan.id, plan.template_id, plan.delivery_date);
        if (success) {
            window.location.reload(); // Quickest way to refresh all data
        }
        setSyncing(false);
    };

    const autoUpdateTasks = async () => {
        if (!plan || !plan.tna_plan_tasks || plan.tna_plan_tasks.length === 0) return;
        setSyncing(true);

        const orderId = plan.production_order_id;

        // 1. Check Cutting Orders
        const { data: cuttings } = await supabase
            .from('cutting_orders')
            .select('total_cut_qty')
            .eq('order_id', orderId);

        // 2. Check Stitching Receives
        const { data: receives } = await supabase
            .from('stitching_receives')
            .select('stitching_receive_items(quantity)')
            .eq('production_order_id', orderId);

        const totalCut = cuttings?.reduce((sum, c) => sum + (c.total_cut_qty || 0), 0) || 0;
        const totalStitched = receives?.reduce((sum, r) => sum + (r.stitching_receive_items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0), 0) || 0;
        const targetQty = plan.production_orders?.total_qty || 1;

        const updates = [];

        // Find tasks to update
        plan.tna_plan_tasks.forEach(task => {
            if (task.status === 'Completed') return;

            if (task.task_name === 'Cutting Start' && (cuttings?.length > 0)) {
                updates.push(updateTaskStatus(task.id, { status: 'Completed', actual_start_date: cuttings[0].created_at }));
            }
            if (task.task_name === 'Cutting Complete' && totalCut >= targetQty) {
                updates.push(updateTaskStatus(task.id, { status: 'Completed', actual_end_date: new Date().toISOString() }));
            }
            if (task.task_name === 'Sewing Start' && (receives?.length > 0)) {
                updates.push(updateTaskStatus(task.id, { status: 'Completed', actual_start_date: new Date().toISOString() }));
            }
            if (task.task_name === 'Sewing Complete' && totalStitched >= targetQty) {
                updates.push(updateTaskStatus(task.id, { status: 'Completed', actual_end_date: new Date().toISOString() }));
            }
        });

        if (updates.length > 0) {
            await Promise.all(updates);
            // Refresh plan details
            const { data } = await supabase
                .from('tna_plans')
                .select('*, production_orders(*, style:styles(styleNo), buyer:buyers(name)), tna_plan_tasks(*)')
                .eq('id', plan.id)
                .single();
            if (data) setPlan(data);
        }
        setSyncing(false);
    };

    useEffect(() => {
        if (plan && plan.tna_plan_tasks?.length > 0) {
            autoUpdateTasks();
        }
    }, [plan?.id]);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Plan Details...</div>;
    if (!plan) return <div className="p-8 text-center text-red-500">Plan not found</div>;

    const totalTasks = plan.tna_plan_tasks?.length || 0;
    const completedTasks = plan.tna_plan_tasks?.filter(t => t.status === 'Completed').length || 0;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Group tasks by Stage (Phase)
    const groupedTasks = plan.tna_plan_tasks?.reduce((groups, task) => {
        const stage = task.stage || 'General';
        if (!groups[stage]) groups[stage] = [];
        groups[stage].push(task);
        return groups;
    }, {});

    // Sort stages logically (or custom order)
    const stageOrder = ['Merchandising', 'Sourcing', 'Pre-Production', 'Production', 'Quality', 'Logistics'];
    const sortedStages = Object.keys(groupedTasks).sort((a, b) => {
        return stageOrder.indexOf(a) - stageOrder.indexOf(b);
    });

    const getStageIcon = (stage) => {
        switch (stage) {
            case 'Merchandising': return <Layers size={18} />;
            case 'Sourcing': return <Clock size={18} />;
            case 'Production': return <Scissors size={18} />;
            case 'Quality': return <Activity size={18} />;
            case 'Logistics': return <Truck size={18} />;
            default: return <Calendar size={18} />;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 border-b border-gray-200 pb-4">
                <Link to="/tna" className="text-gray-500 hover:text-gray-700 bg-gray-100 p-2 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        {plan.production_orders?.order_no || 'Unknown Order'}
                        <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {plan.production_orders?.style?.styleNo || 'N/A'}
                        </span>
                    </h1>
                    <div className="text-sm text-gray-500 flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1"><User size={14} /> Buyer: {plan.production_orders?.buyer?.name || 'N/A'}</span>
                        <span className="flex items-center gap-1"><Truck size={14} /> Delivery: {format(new Date(plan.delivery_date), 'dd MMM yyyy')}</span>
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-6">
                    <button
                        onClick={autoUpdateTasks}
                        disabled={syncing}
                        className="flex items-center gap-2 px-3 py-1.5 bg-sage-50 text-sage-600 rounded-lg hover:bg-sage-100 transition-all border border-sage-200 text-xs font-bold disabled:opacity-50"
                    >
                        <Activity size={14} className={syncing ? "animate-spin" : ""} />
                        {syncing ? "Syncing..." : "Sync Production"}
                    </button>
                    <div className="text-right">
                        <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Overall Progress</div>
                        <div className="flex items-center gap-2 justify-end">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div className="bg-sage-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                            </div>
                            <span className="text-lg font-bold text-sage-700">{progress}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toggle View */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'list' ? 'bg-white text-sage-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Phase View
                </button>
                <button
                    onClick={() => setActiveTab('gantt')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'gantt' ? 'bg-white text-sage-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Gantt Chart
                </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[500px]">
                {plan.tna_plan_tasks?.length === 0 ? (
                    <div className="p-20 text-center space-y-4">
                        <Layers size={48} className="text-gray-200 mx-auto" />
                        <div>
                            <p className="text-gray-500 font-medium">No tasks found for this plan.</p>
                            <p className="text-sm text-gray-400">This can happen if the template was empty when the plan was created.</p>
                        </div>
                        <button
                            onClick={handleRegenerate}
                            disabled={syncing}
                            className="inline-flex items-center gap-2 px-6 py-2 bg-sage-800 text-white rounded-xl hover:bg-sage-900 transition-all font-bold shadow-lg disabled:opacity-50"
                        >
                            <Save size={18} /> Regenerate Plan Tasks
                        </button>
                    </div>
                ) : activeTab === 'gantt' ? (
                    <div className="p-6">
                        <TNAGanttChart tasks={plan.tna_plan_tasks} />
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {sortedStages.map(stage => (
                            <div key={stage} className="p-0">
                                <div className="bg-gray-50 px-6 py-3 border-y border-gray-100 flex items-center gap-2 font-semibold text-gray-700">
                                    {getStageIcon(stage)}
                                    {stage}
                                    <span className="text-xs font-normal text-gray-400 ml-2">({groupedTasks[stage].length} tasks)</span>
                                </div>
                                <div className="px-6">
                                    <TNATaskList tasks={groupedTasks[stage]} hideHeader={true} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TNAPlanDetails;
