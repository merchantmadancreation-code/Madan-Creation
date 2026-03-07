import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { ArrowLeft, Edit2, Printer } from 'lucide-react';
import Barcode from 'react-barcode';

const ItemDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { items } = usePurchaseOrder();
    const [item, setItem] = useState(null);

    useEffect(() => {
        if (id && items.length > 0) {
            const foundItem = items.find(i => i.id === id);
            if (foundItem) {
                setItem(foundItem);
            } else {
                navigate('/items');
            }
        }
    }, [id, items, navigate]);

    if (!item) {
        return (
            <div className="flex justify-center items-center h-64 text-sage-500">
                Loading...
            </div>
        );
    }

    const DetailRow = ({ label, value }) => (
        <div className="flex border-b border-sage-100 last:border-0 py-3">
            <span className="w-1/3 text-sage-600 font-medium">{label}</span>
            <span className="w-2/3 text-sage-900">{value || '-'}</span>
        </div>
    );

    return (
        <>
            <div className="max-w-3xl mx-auto space-y-6 print:hidden">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/items" className="text-sage-500 hover:text-sage-700">
                            <ArrowLeft className="w-6 h-6" />
                        </Link>
                        <h1 className="text-2xl font-bold text-sage-800">
                            {item.name}
                        </h1>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            to={`/items/edit/${item.id}`}
                            className="flex items-center gap-2 px-4 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors shadow-sm"
                        >
                            <Edit2 className="w-4 h-4" />
                            Edit Item
                        </Link>
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-2 px-4 py-2 bg-sage-800 text-white rounded-lg hover:bg-sage-900 transition-colors shadow-sm"
                        >
                            <Printer className="w-4 h-4" />
                            Print Label
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-sage-100 overflow-hidden">
                    <div className="p-6 bg-sage-50 border-b border-sage-200">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm text-sage-600 uppercase tracking-wider font-semibold">Fabric Code</p>
                                <p className="text-3xl font-mono text-sage-900 mt-1">{item.fabricCode}</p>
                            </div>

                            <div className="flex justify-center bg-white p-2 rounded-lg shadow-sm">
                                <Barcode
                                    value={item.fabricCode}
                                    width={1.5}
                                    height={50}
                                    fontSize={14}
                                    background="#ffffff"
                                    lineColor="#000000"
                                />
                            </div>

                            <div className="text-right">
                                {item.hsnCode && (
                                    <>
                                        <p className="text-sm text-sage-600 uppercase tracking-wider font-semibold">HSN Code</p>
                                        <p className="text-xl font-mono text-sage-900 mt-1">{item.hsnCode}</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                            <div className="space-y-1">
                                <h3 className="text-lg font-semibold text-sage-800 mb-4 border-b border-sage-200 pb-2">General Info</h3>
                                <DetailRow label="Description" value={item.description} />
                                <DetailRow label="Material Type" value={item.materialType} />
                                <DetailRow label="Fabric Type" value={item.fabricType} />
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-lg font-semibold text-sage-800 mb-4 border-b border-sage-200 pb-2">Specifications</h3>
                                <DetailRow label="Width" value={item.fabricWidth} />
                                <DetailRow label="Color" value={item.color} />
                                <DetailRow label="Design" value={item.fabricDesign} />
                                <DetailRow label="Unit" value={item.unit} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Label Layout - Hidden on Screen, Visible on Print */}
            <div id="print-label" className="hidden print:flex fixed inset-0 z-[9999] bg-white items-center justify-center p-4">
                <div className="w-[6in] h-[4in] border border-sage-200 bg-cream p-6 flex flex-col gap-6" style={{ transform: 'rotate(90deg) scale(0.9)' }}>
                    {/* Rotate for 4x6 Portrait printer if needed, or assume 6x4 Landscape. 
                        Usually 4x6 labels are portrait. If the UI is horizontal, maybe we should output 4x6 landscape?
                        User asked for "4x6 label sticker". Standard shipping labels are 4x6 portrait.
                        But the UI is horizontal. 
                        If I make it 6in wide and 4in high, it fits the UI better.
                        Let's try to fit the UI into 4in width (Portrait) or make it Landscape 6x4.
                        Ref: "first image" was portrait. "second image" is horizontal.
                        User wants "same as second image".
                        I will create a horizontal layout.
                    */}
                    <div className="bg-sage-50 border border-sage-200 p-4 rounded-xl">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-xs text-sage-600 uppercase tracking-wider font-semibold">Fabric Code</p>
                                <p className="text-2xl font-mono text-sage-900 font-bold">{item.fabricCode}</p>
                            </div>

                            <div className="flex justify-center bg-white p-2 rounded-lg shadow-sm">
                                <Barcode
                                    value={item.fabricCode}
                                    width={1.5}
                                    height={40}
                                    fontSize={12}
                                    displayValue={true}
                                />
                            </div>

                            <div className="text-right">
                                {item.hsnCode && (
                                    <>
                                        <p className="text-xs text-sage-600 uppercase tracking-wider font-semibold">HSN Code</p>
                                        <p className="text-xl font-mono text-sage-900 font-bold">{item.hsnCode}</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-md font-bold text-sage-800 mb-2 border-b border-sage-200 pb-1">General Info</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between border-b border-sage-100 py-1">
                                    <span className="text-sage-600">Description</span>
                                    <span className="text-sage-900 font-medium">{item.description}</span>
                                </div>
                                <div className="flex justify-between border-b border-sage-100 py-1">
                                    <span className="text-sage-600">Material</span>
                                    <span className="text-sage-900 font-medium">{item.materialType}</span>
                                </div>
                                <div className="flex justify-between border-b border-sage-100 py-1">
                                    <span className="text-sage-600">Type</span>
                                    <span className="text-sage-900 font-medium">{item.fabricType}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-md font-bold text-sage-800 mb-2 border-b border-sage-200 pb-1">Specifications</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between border-b border-sage-100 py-1">
                                    <span className="text-sage-600">Width</span>
                                    <span className="text-sage-900 font-medium">{item.fabricWidth}</span>
                                </div>
                                <div className="flex justify-between border-b border-sage-100 py-1">
                                    <span className="text-sage-600">Color</span>
                                    <span className="text-sage-900 font-medium">{item.color}</span>
                                </div>
                                <div className="flex justify-between border-b border-sage-100 py-1">
                                    <span className="text-sage-600">Design</span>
                                    <span className="text-sage-900 font-medium">{item.fabricDesign}</span>
                                </div>
                                <div className="flex justify-between border-b border-sage-100 py-1">
                                    <span className="text-sage-600">Unit</span>
                                    <span className="text-sage-900 font-medium">{item.unit}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ItemDetails;
