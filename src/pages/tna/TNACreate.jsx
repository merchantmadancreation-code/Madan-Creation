import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTNA } from '../../context/TNAContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { Save } from 'lucide-react';

const TNACreate = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { templates, createTNAPlan } = useTNA();

    const queryParams = new URLSearchParams(location.search);
    const preSelectedOrderId = queryParams.get('orderId');

    const [orders, setOrders] = useState([]);
    const [selectedOrderId, setSelectedOrderId] = useState(preSelectedOrderId || '');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchOrders = async () => {
            // Fetch active production orders that don't have a plan yet (optional filtering)
            const { data } = await supabase
                .from('production_orders')
                .select('id, order_no, delivery_date')
                .order('created_at', { ascending: false });
            setOrders(data || []);
        };
        fetchOrders();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedOrderId || !selectedTemplateId) return;

        setLoading(true);
        const order = orders.find(o => o.id === selectedOrderId);
        if (!order || !order.delivery_date) {
            alert('Selected order does not have a delivery date set.');
            setLoading(false);
            return;
        }

        const planId = await createTNAPlan(selectedOrderId, selectedTemplateId, order.delivery_date);
        if (planId) {
            navigate(`/tna/${planId}`);
        } else {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Generate TNA Plan</h1>

            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Production Order</label>
                        <select
                            value={selectedOrderId}
                            onChange={(e) => setSelectedOrderId(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sage-500 focus:ring-sage-500"
                            required
                        >
                            <option value="">Select Order</option>
                            {orders.map(order => (
                                <option key={order.id} value={order.id}>
                                    {order.order_no} (Del: {order.delivery_date || 'N/A'})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">TNA Template</label>
                        <select
                            value={selectedTemplateId}
                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sage-500 focus:ring-sage-500"
                            required
                        >
                            <option value="">Select Template</option>
                            {templates.map(tmpl => (
                                <option key={tmpl.id} value={tmpl.id}>
                                    {tmpl.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-sage-600 text-white px-6 py-2 rounded-lg hover:bg-sage-700 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={18} />
                            {loading ? 'Generating...' : 'Generate Plan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TNACreate;
