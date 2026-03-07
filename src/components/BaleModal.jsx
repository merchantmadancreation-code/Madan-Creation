import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';

const BaleModal = ({ isOpen, onClose, initialBales = [], onSave, itemName, expectedQty = 0 }) => {
    const [bales, setBales] = useState([]);

    useEffect(() => {
        if (isOpen) {
            // Initialize with existing bales (deep copy) or one empty bale if none
            // We only run this when isOpen changes to true to avoid resetting while typing
            const startingBales = initialBales && initialBales.length > 0
                ? initialBales.map(b => ({ baleNo: b.baleNo || '', qty: b.qty }))
                : [{ baleNo: '', qty: '' }];
            setBales(startingBales);
        }
    }, [isOpen]); // Removed initialBales from dependency to prevent random resets

    if (!isOpen) return null;

    const handleAddBale = () => {
        setBales([...bales, { qty: '' }]);
    };

    const handleRemoveBale = (index) => {
        const newBales = bales.filter((_, i) => i !== index);
        setBales(newBales.length > 0 ? newBales : [{ qty: '' }]);
    };

    const handleChange = (index, key, value) => {
        setBales(prevBales => {
            const newBales = [...prevBales];
            newBales[index] = { ...newBales[index], [key]: value };
            return newBales;
        });
    };

    const calculateTotal = () => {
        return bales.reduce((sum, bale) => sum + Number(bale.qty || 0), 0);
    };

    const totalQty = calculateTotal();
    const difference = totalQty - Number(expectedQty || 0);
    const isMatched = Math.abs(difference) < 0.01;

    const handleSave = () => {
        // Filter out empty bales unless it's the only one
        const validBales = bales.filter(b => b.qty !== '' && b.qty !== 0);
        const finalBales = validBales.length > 0 ? validBales : [];
        const finalTotal = calculateTotal();

        onSave(finalBales, finalTotal);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-sage-100 bg-sage-50">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="text-lg font-bold text-sage-800">Add Bales</h3>
                            <p className="text-xs text-sage-500 truncate max-w-[200px]" title={itemName}>{itemName}</p>
                        </div>
                        <button onClick={onClose} className="text-sage-400 hover:text-sage-600 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Qty Comparison Header */}
                    <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-sage-200">
                        <div>
                            <span className="block text-[10px] uppercase text-sage-400 font-bold tracking-wider">Target Qty</span>
                            <span className="text-sm font-mono font-bold text-sage-600">{Number(expectedQty).toFixed(2)}</span>
                        </div>
                        <div className="text-right">
                            <span className="block text-[10px] uppercase text-sage-400 font-bold tracking-wider">Difference</span>
                            <span className={`text-sm font-mono font-bold ${isMatched ? 'text-green-600' : 'text-red-500'}`}>
                                {difference > 0 ? '+' : ''}{difference.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="space-y-3">
                        {bales.map((bale, index) => (
                            <div key={index} className="flex items-center gap-3 animate-fadeIn">
                                <span className="text-sm font-mono text-sage-400 w-6 text-right">#{index + 1}</span>

                                {/* Bale No Input */}
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={bale.baleNo}
                                        onChange={(e) => handleChange(index, 'baleNo', e.target.value)}
                                        placeholder="Bale No"
                                        className="w-full pl-3 pr-2 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none transition-all placeholder:text-sage-300 text-sm"
                                        autoFocus={index === bales.length - 1 && bale.baleNo === ''}
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-sage-400 font-medium bg-white px-1">No.</span>
                                </div>

                                {/* Qty Input */}
                                <div className="w-32 relative">
                                    <input
                                        type="number"
                                        value={bale.qty}
                                        onChange={(e) => handleChange(index, 'qty', e.target.value)}
                                        placeholder="Qty"
                                        className="w-full pl-3 pr-8 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none transition-all placeholder:text-sage-300 text-right"
                                        autoFocus={index === bales.length - 1 && bale.baleNo !== ''}
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-sage-400 font-medium">Qty</span>
                                </div>

                                <button
                                    onClick={() => handleRemoveBale(index)}
                                    className="p-2 text-sage-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    tabIndex="-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleAddBale}
                        className="mt-4 w-full py-2 border-2 border-dashed border-sage-200 text-sage-500 rounded-lg hover:border-sage-400 hover:text-sage-700 hover:bg-sage-50 transition-all flex items-center justify-center gap-2 font-medium"
                    >
                        <Plus className="w-4 h-4" /> Add Another Bale
                    </button>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-sage-100 bg-sage-50 flex justify-between items-center">
                    <div>
                        <span className="block text-xs uppercase text-sage-500 font-bold tracking-wider">Total Qty</span>
                        <span className="text-xl font-mono font-bold text-sage-900">{totalQty.toFixed(2)}</span>
                    </div>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-sage-800 text-white rounded-lg hover:bg-sage-900 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 font-medium"
                    >
                        <Save className="w-4 h-4" /> Save Bales
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BaleModal;
