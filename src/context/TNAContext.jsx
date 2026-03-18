import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { calculateTNADates } from '../utils/tnaUtils';
import { seedStandardTNATemplate } from '../utils/tnaSeed';

const TNAContext = createContext();

export const useTNA = () => {
    const context = useContext(TNAContext);
    if (!context) {
        throw new Error('useTNA must be used within a TNAProvider');
    }
    return context;
};

export const TNAProvider = ({ children }) => {
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [activePlans, setActivePlans] = useState([]);

    useEffect(() => {
        fetchTemplates();
        fetchActivePlans();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        await seedStandardTNATemplate();
        const { data, error } = await supabase
            .from('tna_templates')
            .select(`
                id, name, description, created_at,
                tna_template_tasks (id, name, duration_days, stage, sequence_order)
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) console.error('Error fetching TNA templates:', error);
        else setTemplates(data || []);
        setLoading(false);
    };

    const fetchActivePlans = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('tna_plans')
            .select(`
                id, order_id, template_id, delivery_date, status, created_at,
                production_orders (
                    order_no, 
                    style:styles(styleNo), 
                    buyer:buyers(name)
                ),
                tna_plan_tasks (id, task_name, planned_start_date, planned_end_date, status, actual_date)
            `)
            .eq('status', 'Active')
            .order('delivery_date', { ascending: true })
            .limit(50);

        if (error) console.error('Error fetching active TNA plans:', error);
        else setActivePlans(data || []);
        setLoading(false);
    };

    const createTemplate = async (templateName, description, tasks) => {
        setLoading(true);
        // 1. Create Template
        const { data: tmplData, error: tmplError } = await supabase
            .from('tna_templates')
            .insert([{ name: templateName, description }])
            .select()
            .single();

        if (tmplError) {
            console.error('Error creating template:', tmplError);
            setLoading(false);
            return null;
        }

        // 2. Create Template Tasks
        const tasksWithId = tasks.map((t, index) => ({
            template_id: tmplData.id,
            name: t.name,
            duration_days: t.duration_days,
            stage: t.stage,
            sequence_order: index + 1
        }));

        const { error: taskError } = await supabase
            .from('tna_template_tasks')
            .insert(tasksWithId);

        if (taskError) console.error('Error creating template tasks:', taskError);

        await fetchTemplates(); // Refresh
        setLoading(false);
        return tmplData.id;
    };

    const updateTemplate = async (templateId, name, description, tasks) => {
        setLoading(true);
        // 1. Update Template Info
        const { error: tmplError } = await supabase
            .from('tna_templates')
            .update({ name, description })
            .eq('id', templateId);

        if (tmplError) {
            console.error('Error updating template:', tmplError);
            setLoading(false);
            return false;
        }

        // 2. Clear Existing Tasks
        const { error: deleteError } = await supabase
            .from('tna_template_tasks')
            .delete()
            .eq('template_id', templateId);

        if (deleteError) {
            console.error('Error deleting old tasks:', deleteError);
        }

        // 3. Insert New Tasks
        const tasksWithId = tasks.map((t, index) => ({
            template_id: templateId,
            name: t.name,
            duration_days: t.duration_days,
            stage: t.stage,
            sequence_order: index + 1
        }));

        const { error: taskError } = await supabase
            .from('tna_template_tasks')
            .insert(tasksWithId);

        if (taskError) console.error('Error creating template tasks:', taskError);

        await fetchTemplates(); // Refresh
        setLoading(false);
        return true;
    };

    const createTNAPlan = async (orderId, templateId, deliveryDate) => {
        setLoading(true);

        // 1. Get Template Tasks
        const template = templates.find(t => t.id === templateId);
        if (!template || !template.tna_template_tasks) {
            console.error('Template not found or has no tasks');
            setLoading(false);
            return;
        }

        // 2. Calculate Dates
        const plannedTasks = calculateTNADates(deliveryDate, template.tna_template_tasks);

        // 3. Create Plan
        const { data: planData, error: planError } = await supabase
            .from('tna_plans')
            .insert([{ order_id: orderId, template_id: templateId, delivery_date: deliveryDate }])
            .select()
            .single();

        if (planError) {
            console.error('Error creating TNA plan:', planError);
            setLoading(false);
            return;
        }

        // 4. Create Plan Tasks
        const dbTasks = plannedTasks.map(task => ({
            plan_id: planData.id,
            template_task_id: task.template_task_id,
            task_name: task.name,
            planned_start_date: task.planned_start_date,
            planned_end_date: task.planned_end_date,
            stage: task.stage,
            status: 'Pending'
        }));

        const { error: tasksError } = await supabase
            .from('tna_plan_tasks')
            .insert(dbTasks);

        if (tasksError) console.error('Error creating plan tasks:', tasksError);

        await fetchActivePlans();
        setLoading(false);
        return planData.id;
    };

    const regenerateTasks = async (planId, templateId, deliveryDate) => {
        setLoading(true);

        const template = templates.find(t => t.id === templateId);
        if (!template || !template.tna_template_tasks) {
            console.error('Template not found or has no tasks');
            setLoading(false);
            return false;
        }

        const plannedTasks = calculateTNADates(deliveryDate, template.tna_template_tasks);

        const dbTasks = plannedTasks.map(task => ({
            plan_id: planId,
            template_task_id: task.template_task_id,
            task_name: task.name,
            planned_start_date: task.planned_start_date,
            planned_end_date: task.planned_end_date,
            stage: task.stage,
            status: 'Pending'
        }));

        const { error: tasksError } = await supabase
            .from('tna_plan_tasks')
            .insert(dbTasks);

        if (tasksError) {
            console.error('Error regenerating plan tasks:', tasksError);
            setLoading(false);
            return false;
        }

        await fetchActivePlans();
        setLoading(false);
        return true;
    };

    const updateTaskStatus = async (taskId, updates) => {
        const { error } = await supabase
            .from('tna_plan_tasks')
            .update(updates)
            .eq('id', taskId);

        if (error) {
            console.error('Error updating task:', error);
            return false;
        }

        // Optimistic update or refresh
        fetchActivePlans();
        return true;
    };

    return (
        <TNAContext.Provider value={{
            loading,
            templates,
            activePlans,
            fetchTemplates,
            fetchActivePlans,
            createTemplate,
            updateTemplate,
            createTNAPlan,
            updateTaskStatus,
            regenerateTasks
        }}>
            {children}
        </TNAContext.Provider>
    );
};
