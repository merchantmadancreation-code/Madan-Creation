import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const ProductionContext = createContext();

export const useProduction = () => {
    const context = useContext(ProductionContext);
    if (!context) {
        throw new Error('useProduction must be used within a ProductionProvider');
    }
    return context;
};

export const ProductionProvider = ({ children }) => {
    const [buyers, setBuyers] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);
    const [lines, setLines] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [machineTypes, setMachineTypes] = useState([]);
    const [machines, setMachines] = useState([]);
    const [operations, setOperations] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Helper to handle safe fetching
            const safeFetch = async (table) => {
                try {
                    const { data, error } = await supabase.from(table).select('*');
                    if (error) {
                        console.warn(`Query error fetching ${table}:`, error.message);
                        return [];
                    }
                    return data || [];
                } catch (e) {
                    console.error(`Fatal error fetching ${table}:`, e);
                    return [];
                }
            };

            const [bu, se, ca, un, li, wo, mt, ma, op] = await Promise.all([
                safeFetch('buyers'),
                safeFetch('seasons'),
                safeFetch('garment_categories'),
                safeFetch('units'),
                safeFetch('production_lines'),
                safeFetch('workers'),
                safeFetch('machine_types'),
                safeFetch('machines'),
                safeFetch('operations_master')
            ]);

            setBuyers(bu);
            setSeasons(se);
            setCategories(ca);
            setUnits(un);
            setLines(li);
            setWorkers(wo);
            setMachineTypes(mt);
            setMachines(ma);
            setOperations(op);
        } catch (error) {
            console.error('ProductionContext: Unexpected error in fetchData:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const addMaster = async (table, item) => {
        const { data, error } = await supabase.from(table).insert([item]).select();
        if (!error) fetchData();
        return { data, error };
    };

    const updateMaster = async (table, id, item) => {
        const { data, error } = await supabase.from(table).update(item).eq('id', id).select();
        if (!error) fetchData();
        return { data, error };
    };

    const deleteMaster = async (table, id) => {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (!error) fetchData();
        return { error };
    };

    return (
        <ProductionContext.Provider value={{
            buyers, seasons, categories, units, lines, workers, machineTypes, machines, operations,
            loading, refresh: fetchData, addMaster, updateMaster, deleteMaster
        }}>
            {children}
        </ProductionContext.Provider>
    );
};
