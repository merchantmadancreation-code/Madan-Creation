import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, Download, Upload } from 'lucide-react';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import * as XLSX from 'xlsx';

const SupplierList = () => {
    const { suppliers, deleteSupplier, addSuppliers } = usePurchaseOrder();
    const fileInputRef = useRef(null);

    const downloadTemplate = () => {
        const headers = [
            'Supplier Name',
            'Contact Person',
            'Mobile',
            'Email',
            'Phone',
            'GSTIN',
            'PAN',
            'Address'
        ];
        // Create dummy data row for example
        const data = [
            ['Example Supplier', 'John Doe', '9876543210', 'john@example.com', '0141-2345678', '08ABCDE1234F1Z5', 'ABCDE1234F', '123 Main St, Jaipur']
        ];

        const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Supplier_Import_Template.csv", { bookType: 'csv' });
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

            // Remove header row
            if (data.length > 0) data.shift();

            const newSuppliers = data.map(row => ({
                name: row[0],
                contactPerson: row[1],
                mobile: row[2],
                email: row[3],
                phone: row[4],
                gstin: row[5],
                pan: row[6],
                address: row[7]
            })).filter(s => s.name); // Basic validation

            if (newSuppliers.length > 0) {
                addSuppliers(newSuppliers);
                alert(`Successfully imported ${newSuppliers.length} suppliers!`);
            } else {
                alert("No valid data found in CSV.");
            }

            // Reset input
            e.target.value = null;
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-2xl font-bold text-sage-800">Suppliers</h1>
                <div className="flex gap-2">
                    <button
                        onClick={downloadTemplate}
                        className="bg-cream text-sage-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-sage-50 transition-colors border border-sage-300"
                    >
                        <Download className="w-4 h-4" />
                        Template CSV
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-sage-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-sage-700 shadow-sm transition-colors"
                    >
                        <Upload className="w-4 h-4" />
                        Import CSV
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".csv,.xlsx,.xls"
                    />
                    <Link to="/suppliers/new" className="bg-sage-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-sage-700 shadow-sm transition-colors">
                        <Plus className="w-4 h-4" />
                        Add Supplier
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-sage-100 overflow-hidden overflow-x-auto">
                {suppliers.length === 0 ? (
                    <div className="p-8 text-center text-sage-500">
                        No suppliers found. Import via CSV or create one to get started.
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-sage-50 border-b border-sage-200 text-xs uppercase text-sage-600 font-semibold">
                                <th className="px-6 py-4">Name & Address</th>
                                <th className="px-6 py-4">Contact Info</th>
                                <th className="px-6 py-4">Tax Details (GST/PAN)</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sage-100">
                            {suppliers.map((supplier) => (
                                <tr key={supplier.id} className="hover:bg-cream transition-colors align-top">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-sage-900">{supplier.name}</div>
                                        <div className="text-sm text-sage-600 mt-1 whitespace-pre-line">{supplier.address}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="text-sage-900 font-medium">{supplier.contactPerson}</div>
                                        {supplier.mobile && <div className="text-sage-600">Mob: {supplier.mobile}</div>}
                                        {supplier.email && <div className="text-sage-600">{supplier.email}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-sage-700">
                                        {supplier.gstin && <div>GST: {supplier.gstin}</div>}
                                        {supplier.pan && <div>PAN: {supplier.pan}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link
                                                to={`/suppliers/edit/${supplier.id}`}
                                                className="p-2 text-sage-600 hover:bg-sage-50 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to delete this supplier?')) {
                                                        deleteSupplier(supplier.id);
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

export default SupplierList;
