import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';

const ItemList = () => {
    const { items, deleteItem } = usePurchaseOrder();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-sage-800">Items</h1>
                <Link to="/items/new" className="bg-sage-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-sage-700 shadow-sm transition-colors">
                    <Plus className="w-4 h-4" />
                    Add Item
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-sage-100 overflow-hidden">
                {items.length === 0 ? (
                    <div className="p-8 text-center text-sage-500">
                        No items found. Create one to get started.
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-sage-50 border-b border-sage-200 text-xs uppercase text-sage-600 font-semibold">
                                <th className="px-6 py-4">Code</th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sage-100">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-cream transition-colors">
                                    <td className="px-6 py-4 font-mono text-sage-600">{item.fabricCode || '-'}</td>
                                    <td className="px-6 py-4 font-medium text-sage-900">{item.name}</td>
                                    <td className="px-6 py-4 text-sage-600">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-sage-50 text-sage-700">
                                            {item.materialType || 'General'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link
                                                to={`/items/${item.id}`}
                                                className="p-2 text-sage-600 hover:bg-sage-50 rounded-lg transition-colors"
                                                title="View Details"
                                            >
                                                <span className="text-sm">👁️</span>
                                            </Link>
                                            <Link
                                                to={`/items/edit/${item.id}`}
                                                className="p-2 text-sage-600 hover:bg-sage-50 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to delete this item?')) {
                                                        deleteItem(item.id);
                                                    }
                                                }}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ItemList;
