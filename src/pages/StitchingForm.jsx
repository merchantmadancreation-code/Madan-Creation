import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
    Save, ArrowLeft, Clock, Play,
    AlertTriangle, CheckSquare, BarChart2,
    Plus, Calculator, Users
} from 'lucide-react';
import clsx from 'clsx';

const StitchingForm = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        plan_id: location.state?.planId || '',
        production_date: new Date().toISOString().split('T')[0],
        hour_interval: new Date().getHours(), // Current hour
        quantity: 0,
        manpower: 0,
        rejected_qty: 0,
        alteration_qty: 0,
        remarks: ''
    });

    useEffect(() => {
        const fetchPlans = async () => {
            setLoading(true);
            const { data } = await supabase
                .from('production_plans')
                .select('id, production_orders(order_no, styles(styleNo)), production_lines(name)')
                .eq('status', 'Scheduled');
            setPlans(data || []);
            setLoading(false);
        };
        fetchPlans();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase.from('hourly_production').insert([formData]);
            if (!error) {
                alert('Production reported successfully!');
                navigate('/stitching');
            } else {
                alert(error.message);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-sage-500 italic">Connecting to sewing floor...</div>;

    const currentHourLabel = `${formData.hour_interval}:00 - ${formData.hour_interval + 1}:00`;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-sage-100 rounded-full transition-colors">
                        <ArrowLeft className="text-sage-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-sage-800">Hourly Production Entry</h1>
                        <p className="text-sage-500 text-sm">Flash report for sewing line output</p>
                    </div>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-sage-800 text-white rounded-xl hover:bg-sage-900 transition-all shadow-lg font-bold disabled:opacity-50"
                >
                    <Save size={18} /> {saving ? 'Submitting...' : 'Post Report'}
                </button>
            </div>

            <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                    {/* Assignment */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-200 space-y-4">
                        <h3 className="font-bold text-sage-800 text-sm uppercase tracking-wider flex items-center gap-2">
                            <Clock size={16} className="text-sage-400" /> Line Assignment
                        </h3>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-sage-500 uppercase tracking-widest">Select Production Line</label>
                            <select
                                required
                                value={formData.plan_id}
                                onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                                className="w-full px-4 py-2.5 bg-sage-50 border border-sage-200 rounded-lg text-sm font-bold"
                            >
                                <option value="">Choose active plan...</option>
                                {plans.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.production_lines?.name} | {p.production_orders?.styles?.styleNo} ({p.production_orders?.order_no})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-sage-500 uppercase tracking-widest">Date</label>
                                <input
                                    type="date"
                                    value={formData.production_date}
                                    onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
                                    className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-sage-500 uppercase tracking-widest">Hour Interval</label>
                                <select
                                    value={formData.hour_interval}
                                    onChange={(e) => setFormData({ ...formData, hour_interval: Number(e.target.value) })}
                                    className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 8).map(h => (
                                        <option key={h} value={h}>{h}:00 - {h + 1}:00</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Resources */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-200 space-y-4">
                        <h3 className="font-bold text-sage-800 text-sm uppercase tracking-wider flex items-center gap-2">
                            <Users size={16} className="text-sage-400" /> Floor Resources
                        </h3>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-sage-500 uppercase tracking-widest text-center block">Active Manpower (Operators/Helpers)</label>
                            <input
                                type="number"
                                value={formData.manpower}
                                onChange={(e) => setFormData({ ...formData, manpower: e.target.value })}
                                className="w-full px-4 py-3 bg-sage-50 border border-sage-200 rounded-xl text-center text-xl font-black text-sage-800"
                                placeholder="0"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Output */}
                    <div className="bg-sage-800 p-8 rounded-3xl shadow-xl shadow-sage-200 space-y-6 text-white overflow-hidden relative">
                        <BarChart2 className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12" />

                        <div className="relative">
                            <h3 className="font-black text-white/50 text-[10px] uppercase tracking-[0.2em] mb-4">Production Output</h3>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-white/80 uppercase">Good Quality (OK Pcs)</label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                        className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-2xl text-3xl font-black focus:outline-none focus:ring-4 focus:ring-white/10 placeholder-white/20"
                                        placeholder="0"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-red-300 uppercase">Rejected</label>
                                        <input
                                            type="number"
                                            value={formData.rejected_qty}
                                            onChange={(e) => setFormData({ ...formData, rejected_qty: e.target.value })}
                                            className="w-full px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-xl text-center font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-amber-300 uppercase">Alteration</label>
                                        <input
                                            type="number"
                                            value={formData.alteration_qty}
                                            onChange={(e) => setFormData({ ...formData, alteration_qty: e.target.value })}
                                            className="w-full px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-xl text-center font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/10 flex justify-between items-center relative">
                            <span className="text-[10px] font-bold text-white/40 uppercase">Efficiency Delta</span>
                            <div className="flex items-center gap-1 text-green-400 font-black text-xs">
                                <Play size={10} className="-rotate-90" /> +4.2% Trend
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-200">
                        <textarea
                            value={formData.remarks}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            placeholder="Reason for downtime / bottleneck (e.g. Machine Breakdown on OPR-01)..."
                            className="w-full px-4 py-3 bg-sage-50 border border-sage-200 rounded-xl text-sm h-32 resize-none"
                        />
                    </div>
                </div>
            </form>
        </div>
    );
};

export default StitchingForm;
