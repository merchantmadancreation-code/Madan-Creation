import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const PurchaseOrderContext = createContext();

export const usePurchaseOrder = () => {
    const context = useContext(PurchaseOrderContext);
    if (!context) {
        throw new Error('usePurchaseOrder must be used within a PurchaseOrderProvider');
    }
    return context;
};

// Helper to generate IDs
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const PurchaseOrderProvider = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState([]);
    const [items, setItems] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [challans, setChallans] = useState([]);
    const [outwardChallans, setOutwardChallans] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [styles, setStyles] = useState([]);
    const [costings, setCostings] = useState([]);
    const [materialIssues, setMaterialIssues] = useState([]);
    const [fabricIssues, setFabricIssues] = useState([]);
    const [cuttingOrders, setCuttingOrders] = useState([]);
    const [schemaError, setSchemaError] = useState(null);
    const [error, setError] = useState(null);

    // Fetch all data on mount
    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            setError(null);
            try {
                console.log("Fetching ERP data sequentially...");
                
                const fetchTable = async (tableName, query, setter) => {
                    try {
                        const { data, error } = await query;
                        if (error) {
                            console.error(`Failed to fetch ${tableName}:`, error);
                            // Don't set global error yet, just log it
                            return { name: tableName, error };
                        }
                        setter(data || []);
                        return { name: tableName, success: true };
                    } catch (err) {
                        console.error(`Exception while fetching ${tableName}:`, err);
                        return { name: tableName, error: err };
                    }
                };

                const fetchTasks = [
                    { name: 'suppliers', query: supabase.from('suppliers').select('id, name').limit(100), setter: setSuppliers },
                    { 
                        name: 'items', 
                        query: supabase.from('items').select('id, name, sku, category, status').limit(100), 
                        setter: setItems 
                    },
                    { name: 'purchase_orders', query: supabase.from('purchase_orders').select('id, created_at, poNumber, date, supplierId, status').limit(50), setter: setPurchaseOrders },
                    { 
                        name: 'challans', 
                        query: supabase.from('challans').select('id, grnNo, date, status').limit(50), 
                        setter: setChallans 
                    },
                    { name: 'outward_challans', query: supabase.from('outward_challans').select('id, outChallanNo, date').limit(50), setter: setOutwardChallans },
                    { name: 'invoices', query: supabase.from('invoices').select('id, invoiceNo, date, status').limit(50), setter: setInvoices },
                    { name: 'styles', query: supabase.from('styles').select('id, styleNo, status, created_at, buyerPO').limit(50), setter: setStyles },
                    { name: 'material_issues', query: supabase.from('material_issues').select('id, issue_no, status').limit(50), setter: setMaterialIssues },
                    { name: 'fabric_issues', query: supabase.from('fabric_issues').select('id, issue_no, status').limit(50), setter: setFabricIssues },
                    { name: 'cutting_orders', query: supabase.from('cutting_orders').select('id, cutting_no, status').limit(50), setter: setCuttingOrders }
                ];

                const results = [];
                // Run critical fetches first, then others
                for (const task of fetchTasks) {
                    const result = await fetchTable(task.name, task.query, task.setter);
                    results.push(result);
                    // Short sleep to prevent hitting rate limits/concurrency spikes
                    await new Promise(r => setTimeout(r, 50)); 
                }

                // Critical parts check: Only fail if EVERYTHING fails or if StyleList can't even get IDs
                const errors = results.filter(r => r.error);
                if (errors.length > 5) { // If more than half the system fails
                    setError(`System is responding slowly. Please check your internet or Supabase quota.`);
                }

                // Costings is handled separately as it was before
                const { data: costingsData, error: costingsError } = await supabase.from('costings').select('*').order('created_at', { ascending: true });
                if (!costingsError) {
                    setCostings(costingsData || []);
                } else {
                    console.error("Costings fetch failed:", costingsError);
                }

            } catch (error) {
                console.error("Error in fetchAllData:", error);
                setError(error.message);
                if (error.message && (error.message.includes('Could not find') || error.message.includes('relation'))) {
                    setSchemaError(error.message);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, []);

    // --- Actions ---
    const sanitizeStyleData = (style) => {
        const sanitized = { ...style };
        if (sanitized.stitchingRate === '') sanitized.stitchingRate = null;
        if (sanitized.perPcsAvg === '') sanitized.perPcsAvg = null;
        if (sanitized.leadTime === '') sanitized.leadTime = null;
        if (sanitized.buyerPOReceivedDate === '') sanitized.buyerPOReceivedDate = null;
        if (sanitized.poExpiredDate === '') sanitized.poExpiredDate = null;
        if (sanitized.poExtensionDate === '') sanitized.poExtensionDate = null;
        if (sanitized.buyerPOCopy === '') sanitized.buyerPOCopy = null;

        if (sanitized.stitchingRate !== null && sanitized.stitchingRate !== undefined && sanitized.stitchingRate !== '') {
            const val = parseFloat(sanitized.stitchingRate);
            sanitized.stitchingRate = isNaN(val) ? null : val;
        }
        if (sanitized.perPcsAvg !== null && sanitized.perPcsAvg !== undefined && sanitized.perPcsAvg !== '') {
            const val = parseFloat(sanitized.perPcsAvg);
            sanitized.perPcsAvg = isNaN(val) ? null : val;
        }
        if (sanitized.leadTime !== null && sanitized.leadTime !== undefined && sanitized.leadTime !== '') {
            const val = parseInt(sanitized.leadTime, 10);
            sanitized.leadTime = isNaN(val) ? null : val;
        }
        if (!sanitized.status) sanitized.status = 'Active';

        return sanitized;
    };

    // Suppliers
    const addSupplier = async (supplier) => {
        const { data, error } = await supabase.from('suppliers').insert([supplier]).select();
        if (error) console.error("Error adding supplier:", error);
        else setSuppliers(prev => [...prev, ...data]);
    };

    const addSuppliers = async (newSuppliers) => {
        const { data, error } = await supabase.from('suppliers').insert(newSuppliers).select();
        if (error) console.error("Error adding suppliers:", error);
        else setSuppliers(prev => [...prev, ...data]);
    };

    const updateSupplier = async (id, updatedSupplier) => {
        const { error } = await supabase.from('suppliers').update(updatedSupplier).eq('id', id);
        if (error) console.error("Error updating supplier:", error);
        else setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updatedSupplier } : s));
    };

    const deleteSupplier = async (id) => {
        const { error } = await supabase.from('suppliers').delete().eq('id', id);
        if (error) console.error("Error deleting supplier:", error);
        else setSuppliers(prev => prev.filter(s => s.id !== id));
    };

    // Items
    const addItem = async (item) => {
        const { data, error } = await supabase.from('items').insert([item]).select();
        if (error) {
            console.error("Error adding item:", error);
            alert(`Error adding item: ${error.message}`);
        } else {
            setItems(prev => [...prev, ...data]);
            return data[0]?.id;
        }
    };

    const updateItem = async (id, updatedItem) => {
        const { error } = await supabase.from('items').update(updatedItem).eq('id', id);
        if (error) console.error("Error updating item:", error);
        else setItems(prev => prev.map(i => i.id === id ? { ...i, ...updatedItem } : i));
    };

    const deleteItem = async (id) => {
        const { error } = await supabase.from('items').delete().eq('id', id);
        if (error) console.error("Error deleting item:", error);
        else setItems(prev => prev.filter(i => i.id !== id));
    };

    // Purchase Orders
    const addPurchaseOrder = async (po) => {
        let poNumber = po.poNumber;
        if (!poNumber || poNumber === 'Auto-generated' || poNumber.startsWith('PO-')) {
            const existingNumbers = purchaseOrders
                .map(p => p.poNumber)
                .filter(n => n && n.startsWith('MCPO-'));
            let maxNum = 0;
            existingNumbers.forEach(n => {
                const numPart = parseInt(n.replace('MCPO-', ''), 10);
                if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
            });
            poNumber = `MCPO-${(maxNum + 1).toString().padStart(5, '0')}`;
        }

        const newPO = {
            poNumber,
            date: po.poDate,
            supplierId: po.supplierId,
            supplierName: po.supplierDetails?.name || '',
            billingAddress: po.buyerDetails?.address || '',
            deliveryAddress: po.terms?.deliveryAddress || '',
            items: po.items,
            commercials: {
                ...po.commercials,
                terms: po.terms,
                buyerDetails: po.buyerDetails,
                supplierDetails: po.supplierDetails,
                authorization: po.authorization,
                calculations: po.calculations,
                attachment: po.attachment
            },
            status: 'Draft'
        };
        const { data, error } = await supabase.from('purchase_orders').insert([newPO]).select();

        if (error) {
            console.error("Error adding PO:", error);
            if (error.message && (error.message.includes('Could not find') || error.message.includes('relation'))) {
                setSchemaError(error.message);
            } else {
                alert(`Error adding Purchase Order: ${error.message}`);
            }
            return null;
        } else {
            setPurchaseOrders(prev => [...prev, ...data]);
            return data[0]?.id;
        }
    };

    const updatePurchaseOrder = async (id, updatedPo) => {
        const sanitizedPo = {
            poNumber: updatedPo.poNumber,
            date: updatedPo.poDate,
            supplierId: updatedPo.supplierId,
            supplierName: updatedPo.supplierDetails?.name || '',
            billingAddress: updatedPo.buyerDetails?.address || '',
            deliveryAddress: updatedPo.terms?.deliveryAddress || '',
            items: updatedPo.items,
            commercials: {
                ...updatedPo.commercials,
                terms: updatedPo.terms,
                buyerDetails: updatedPo.buyerDetails,
                supplierDetails: updatedPo.supplierDetails,
                authorization: updatedPo.authorization,
                calculations: updatedPo.calculations,
                attachment: updatedPo.attachment
            },
            status: updatedPo.status || 'Draft'
        };

        const { error } = await supabase.from('purchase_orders').update(sanitizedPo).eq('id', id);
        if (error) {
            console.error("Error updating PO:", error);
            if (error.message && (error.message.includes('Could not find') || error.message.includes('relation'))) {
                setSchemaError(error.message);
            } else {
                alert(`Error updating Purchase Order: ${error.message}`);
            }
            return false;
        } else {
            setPurchaseOrders(prev => prev.map(po => po.id === id ? { ...po, ...updatedPo } : po));
            return true;
        }
    };

    const updatePOStatus = async (id, newStatus) => {
        const { error } = await supabase.from('purchase_orders').update({ status: newStatus }).eq('id', id);
        if (error) console.error("Error updating PO status:", error);
        else setPurchaseOrders(prev => prev.map(po => po.id === id ? { ...po, status: newStatus } : po));
    };

    const deletePurchaseOrder = async (id) => {
        const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
        if (error) console.error("Error deleting PO:", error);
        else setPurchaseOrders(prev => prev.filter(po => po.id !== id));
    };

    // Challans
    const addChallan = async (challan) => {
        let grnNo = challan.grnNo;
        if (!grnNo) {
            const existingGRNs = challans.map(c => c.grnNo).filter(n => n && n.startsWith('CHGRN-'));
            let maxNum = 0;
            existingGRNs.forEach(n => {
                const numPart = parseInt(n.replace('CHGRN-', ''), 10);
                if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
            });
            grnNo = `CHGRN-${(maxNum + 1).toString().padStart(5, '0')}`;
        }

        const newChallan = { ...challan, grnNo };
        const { data, error } = await supabase.from('challans').insert([newChallan]).select();

        if (error) {
            console.error("Error adding Challan:", error);
            if (error.message && (error.message.includes('Could not find') || error.message.includes('relation'))) {
                setSchemaError(error.message);
            }
            return { error };
        } else {
            setChallans(prev => [...prev, ...data]);
            return { data };
        }
    };

    const updateChallan = async (id, updatedChallan) => {
        const { error } = await supabase.from('challans').update(updatedChallan).eq('id', id);
        if (error) {
            console.error("Error updating Challan:", error);
            return { error };
        } else {
            setChallans(prev => prev.map(c => c.id === id ? { ...c, ...updatedChallan } : c));
            return { success: true };
        }
    };

    const deleteChallan = async (id) => {
        const { error } = await supabase.from('challans').delete().eq('id', id);
        if (error) console.error("Error deleting Challan:", error);
        else setChallans(prev => prev.filter(c => c.id !== id));
    };

    const addOutwardChallan = async (challan) => {
        let outChallanNo = challan.outChallanNo;
        if (!outChallanNo || outChallanNo === 'Auto-generated') {
            const existingNos = outwardChallans.map(c => c.outChallanNo).filter(n => n && n.startsWith('MCOUT-'));
            let maxNum = 0;
            existingNos.forEach(n => {
                const numPart = parseInt(n.replace('MCOUT-', ''), 10);
                if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
            });
            outChallanNo = `MCOUT-${(maxNum + 1).toString().padStart(5, '0')}`;
        }

        const newChallan = { ...challan, outChallanNo };
        const { data, error } = await supabase.from('outward_challans').insert([newChallan]).select();

        if (error) {
            console.error("Error adding Outward Challan:", error);
            return { error };
        } else {
            setOutwardChallans(prev => [...prev, ...data]);
            return { data };
        }
    };

    const updateOutwardChallan = async (id, updatedChallan) => {
        const { error } = await supabase.from('outward_challans').update(updatedChallan).eq('id', id);
        if (error) {
            console.error("Error updating Outward Challan:", error);
            return { error };
        } else {
            setOutwardChallans(prev => prev.map(c => c.id === id ? { ...c, ...updatedChallan } : c));
            return { success: true };
        }
    };

    const deleteOutwardChallan = async (id) => {
        const { error } = await supabase.from('outward_challans').delete().eq('id', id);
        if (error) console.error("Error deleting Outward Challan:", error);
        else setOutwardChallans(prev => prev.filter(c => c.id !== id));
    };

    // Invoices
    const generateGRNNo = () => {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yy = String(now.getFullYear()).slice(-2);
        const datePart = `${dd}${mm}${yy}`;

        // Global Max Sequence across all invoices
        let maxSeq = 0;
        invoices.forEach(inv => {
            if (inv.grnNo) {
                // Extract last 2 digits for sequence
                const seqStr = inv.grnNo.slice(-2);
                const seqPart = parseInt(seqStr, 10);
                if (!isNaN(seqPart) && seqPart > maxSeq) maxSeq = seqPart;
            }
        });

        const nextSeq = String(maxSeq + 1).padStart(2, '0');
        return `GRN-${datePart}${nextSeq}`;
    };

    const addInvoice = async (invoice) => {
        // Use provided GRN No if valid, otherwise generate new
        const grnNo = (invoice.grnNo && invoice.grnNo !== 'Auto-generated')
            ? invoice.grnNo
            : generateGRNNo();

        const newInvoice = { ...invoice, grnNo, status: 'Draft' };
        const { data, error } = await supabase.from('invoices').insert([newInvoice]).select();

        if (error) {
            console.error("Error adding Invoice:", error);
            return { error };
        } else {
            if (newInvoice.items && newInvoice.items.length > 0) {
                for (const invItem of newInvoice.items) {
                    if (invItem.itemId && invItem.rate) {
                        await updateItem(invItem.itemId, { rate: parseFloat(invItem.rate) });
                    }
                }
            }
            setInvoices(prev => [data[0], ...prev]); // Add to top since sorted by DESC
            return { data };
        }
    };

    const updateInvoice = async (id, updatedInvoice) => {
        const { error } = await supabase.from('invoices').update(updatedInvoice).eq('id', id);
        if (error) {
            console.error("Error updating Invoice:", error);
        } else {
            if (updatedInvoice.items && updatedInvoice.items.length > 0) {
                for (const invItem of updatedInvoice.items) {
                    if (invItem.itemId && invItem.rate) {
                        await updateItem(invItem.itemId, { rate: parseFloat(invItem.rate) });
                    }
                }
            }
            setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...updatedInvoice } : inv));
        }
    };

    const verifyInvoice = async (id) => {
        const { error } = await supabase.from('invoices').update({ status: 'Verified' }).eq('id', id);
        if (error) console.error("Error verifying Invoice:", error);
        else setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'Verified' } : inv));
    };

    const deleteInvoice = async (id) => {
        const { error } = await supabase.from('invoices').delete().eq('id', id);
        if (error) console.error("Error deleting Invoice:", error);
        else setInvoices(prev => prev.filter(inv => inv.id !== id));
    };

    // Styles
    const addStyle = async (rawStyle) => {
        const style = sanitizeStyleData(rawStyle);
        const { data, error } = await supabase.from('styles').insert([style]).select();
        if (error) {
            console.error("Error adding Style:", error);
            if (error.message && (error.message.includes('Could not find') || error.message.includes('relation'))) {
                setSchemaError(error.message);
            } else {
                alert(`Error adding Style: ${error.message}`);
            }
            return null;
        } else if (data && data.length > 0) {
            setStyles(prev => [...prev, ...data]);
            return data[0].id;
        } else {
            return null;
        }
    };

    const updateStyle = async (id, rawUpdate) => {
        // If it's only a status update, try using RPC to bypass PostgREST cache issues
        const updateKeys = Object.keys(rawUpdate);
        if (updateKeys.length === 1 && updateKeys[0] === 'status') {
            const { error: rpcError } = await supabase.rpc('update_style_status', {
                style_id: id,
                new_status: rawUpdate.status
            });

            if (!rpcError) {
                setStyles(prev => prev.map(s => s.id === id ? { ...s, ...rawUpdate } : s));
                return true;
            }
            console.warn("RPC update failed, falling back to standard update:", rpcError);
        }

        let updateData = { ...rawUpdate };
        if (updateData.styleNo) {
            updateData = sanitizeStyleData(updateData);
        }

        const { id: _, created_at, ...cleanUpdateData } = updateData;

        const { error } = await supabase.from('styles').update(cleanUpdateData).eq('id', id);
        if (error) {
            console.error("Error updating Style:", error);
            const errorMsg = error.message || 'Unknown error';

            if (errorMsg.includes('Could not find') || errorMsg.includes('relation')) {
                setSchemaError(errorMsg);
                alert(`STALE SCHEMA CACHE DETECTED: The database has been updated but the API is still refreshing. \n\nPlease use the "Repair Schema Errors" tab in the Cloud Sync tool.`);
            } else {
                alert(`Error updating Style: ${errorMsg}`);
            }
            return false;
        } else {
            setStyles(prev => prev.map(s => s.id === id ? { ...s, ...updateData } : s));
            return true;
        }
    };

    const deleteStyle = async (id) => {
        const { error } = await supabase.from('styles').delete().eq('id', id);
        if (error) console.error("Error deleting Style:", error);
        else setStyles(prev => prev.filter(s => s.id !== id));
    };

    const addStylesBulk = async (newStyles) => {
        const sanitizedStyles = newStyles.map(s => sanitizeStyleData(s));
        const { data, error } = await supabase.from('styles').insert(sanitizedStyles).select();

        if (error) {
            console.error("Error adding bulk styles:", error);
            alert(`Error adding bulk styles: ${error.message}`);
            return { success: false, error };
        } else {
            setStyles(prev => [...prev, ...data]);
            return { success: true, count: data.length };
        }
    };

    const deleteStylesBulk = async (ids) => {
        const { error } = await supabase.from('styles').delete().in('id', ids);
        if (error) {
            console.error("Error deleting bulk styles:", error);
            alert(`Error deleting styles: ${error.message}`);
            return { success: false, error };
        } else {
            setStyles(prev => prev.filter(s => !ids.includes(s.id)));
            return { success: true };
        }
    };

    // Costings
    const addCosting = async (costing) => {
        const { data, error } = await supabase.from('costings').insert([costing]).select();
        if (error) {
            console.error("Error adding Costing:", error);
            if (error.message && (error.message.includes('Could not find') || error.message.includes('relation'))) {
                setSchemaError(error.message);
            } else {
                alert(`Error adding Costing: ${error.message}`);
            }
            return null;
        } else {
            setCostings(prev => [...prev, ...data]);
            return data[0]?.id;
        }
    };

    const updateCosting = async (id, updatedCosting) => {
        const { error } = await supabase.from('costings').update(updatedCosting).eq('id', id);
        if (error) {
            console.error("Error updating Costing:", error);
            if (error.message && (error.message.includes('Could not find') || error.message.includes('relation'))) {
                setSchemaError(error.message);
            } else {
                alert(`Error updating Costing: ${error.message}`);
            }
            return false;
        } else {
            setCostings(prev => prev.map(c => c.id === id ? { ...c, ...updatedCosting } : c));
            return true;
        }
    };

    const deleteCosting = async (id) => {
        const { error } = await supabase.from('costings').delete().eq('id', id);
        if (error) console.error("Error deleting Costing:", error);
        else setCostings(prev => prev.filter(c => c.id !== id));
    };

    // Fabric Issues
    const addFabricIssue = async (issue) => {
        const { data, error } = await supabase.from('fabric_issues').insert([issue]).select();
        if (error) {
            console.error("Error adding Fabric Issue:", error);
            return { error };
        } else {
            setFabricIssues(prev => [data[0], ...prev]);
            return { data };
        }
    };

    const updateFabricIssueStatus = async (id, newStatus) => {
        const { error } = await supabase.from('fabric_issues').update({ status: newStatus }).eq('id', id);
        if (error) console.error("Error updating Fabric Issue status:", error);
        else setFabricIssues(prev => prev.map(fi => fi.id === id ? { ...fi, status: newStatus } : fi));
    };

    const deleteFabricIssue = async (id) => {
        const { error } = await supabase.from('fabric_issues').delete().eq('id', id);
        if (error) console.error("Error deleting Fabric Issue:", error);
        else setFabricIssues(prev => prev.filter(fi => fi.id !== id));
    };

    return (
        <PurchaseOrderContext.Provider value={{
            loading,
            suppliers, addSupplier, addSuppliers, updateSupplier, deleteSupplier,
            items, addItem, updateItem, deleteItem,
            purchaseOrders, addPurchaseOrder, updatePurchaseOrder, updatePOStatus, deletePurchaseOrder,
            challans, addChallan, updateChallan, deleteChallan,
            outwardChallans, addOutwardChallan, updateOutwardChallan, deleteOutwardChallan,
            invoices, addInvoice, updateInvoice, verifyInvoice, deleteInvoice,
            styles, addStyle, updateStyle, deleteStyle, addStylesBulk, deleteStylesBulk,
            costings, addCosting, updateCosting, deleteCosting,
            materialIssues, setMaterialIssues,
            fabricIssues, addFabricIssue, updateFabricIssueStatus, deleteFabricIssue,
            cuttingOrders, setCuttingOrders,
            schemaError, setSchemaError,
            error, setError, loading
        }}>
            {children}
        </PurchaseOrderContext.Provider>
    );
};
