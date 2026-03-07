import { supabase } from '../lib/supabase';

export const seedStandardTNATemplate = async () => {
    // 1. Check if template and tasks exist
    const { data: existing } = await supabase
        .from('tna_templates')
        .select('id, tna_template_tasks(id)')
        .eq('name', 'Standard Export TNA (Woven/Knit)')
        .maybeSingle();

    if (existing && existing.tna_template_tasks && existing.tna_template_tasks.length > 0) {
        console.log('Standard Template and tasks already exist.');
        return;
    }

    let templateId = existing?.id;

    if (!templateId) {
        // 2. Create Template
        const { data: template, error: tmplError } = await supabase
            .from('tna_templates')
            .insert([{
                name: 'Standard Export TNA (Woven/Knit)',
                description: 'Comprehensive export workflow from Order Confirmation to Shipment.'
            }])
            .select()
            .single();

        if (tmplError) {
            console.error('Error creating template:', tmplError);
            return;
        }
        templateId = template.id;
    }

    // 3. Define Tasks (Duration in Days, Sequence)
    // We will use a "reverse sequence" mental model for days calculation, but here we store standard duration
    // The specific anchor logic (e.g. Inspection = Shipment - 2) will be handled in tnaUtils.js
    const tasks = [
        // Phase 1: Merchandising (Seq 1-10)
        { name: 'Order Confirmation', stage: 'Merchandising', duration_days: 1, sequence_order: 1 },
        { name: 'Tech Pack Review', stage: 'Merchandising', duration_days: 2, sequence_order: 2 },
        { name: 'Fabric Booking', stage: 'Sourcing', duration_days: 5, sequence_order: 3 },
        { name: 'Lab Dip Submission', stage: 'Merchandising', duration_days: 4, sequence_order: 4 },
        { name: 'Lab Dip Approval', stage: 'Merchandising', duration_days: 3, sequence_order: 5 },
        { name: 'Fit Sample Submission', stage: 'Merchandising', duration_days: 5, sequence_order: 6 },
        { name: 'Fit Sample Approval', stage: 'Merchandising', duration_days: 2, sequence_order: 7 },
        { name: 'Trims Booking', stage: 'Sourcing', duration_days: 3, sequence_order: 8 },
        { name: 'Fabric Inhouse', stage: 'Sourcing', duration_days: 15, sequence_order: 9 },
        { name: 'Fabric Inspection (4-Point)', stage: 'Quality', duration_days: 3, sequence_order: 10 },

        // Phase 2: Pre-Production (Seq 11-15)
        { name: 'Trims Inhouse', stage: 'Sourcing', duration_days: 10, sequence_order: 11 },
        { name: 'PP Meeting', stage: 'Production', duration_days: 1, sequence_order: 12 },
        { name: 'Size Set Sample', stage: 'Merchandising', duration_days: 5, sequence_order: 13 },
        { name: 'PP Sample Submission', stage: 'Merchandising', duration_days: 3, sequence_order: 14 },
        { name: 'PP Sample Approval', stage: 'Merchandising', duration_days: 2, sequence_order: 15 },
        { name: 'Marker Approval', stage: 'Production', duration_days: 1, sequence_order: 16 },

        // Phase 3: Production (Seq 17-23)
        { name: 'Cutting Start', stage: 'Production', duration_days: 1, sequence_order: 17 },
        { name: 'Cutting Complete', stage: 'Production', duration_days: 3, sequence_order: 18 },
        { name: 'Sewing Start', stage: 'Production', duration_days: 1, sequence_order: 19 },
        { name: 'Inline Inspection', stage: 'Quality', duration_days: 1, sequence_order: 20 },
        { name: 'Midline Audit', stage: 'Quality', duration_days: 1, sequence_order: 21 },
        { name: 'Sewing Complete', stage: 'Production', duration_days: 10, sequence_order: 22 },
        { name: 'Washing', stage: 'Production', duration_days: 3, sequence_order: 23 },
        { name: 'Finishing Start', stage: 'Production', duration_days: 1, sequence_order: 24 },
        { name: 'Finishing Complete', stage: 'Production', duration_days: 4, sequence_order: 25 },

        // Phase 4: Quality & Shipment (Seq 26-31)
        { name: 'Carton Audit', stage: 'Quality', duration_days: 1, sequence_order: 26 },
        { name: 'Packing Complete', stage: 'Production', duration_days: 2, sequence_order: 27 },
        { name: 'Metal Detection', stage: 'Quality', duration_days: 1, sequence_order: 28 },
        { name: 'Final Inspection (AQL)', stage: 'Quality', duration_days: 1, sequence_order: 29 }, // Fixed Anchor: Shipment - 2
        { name: 'Ex-Factory', stage: 'Logistics', duration_days: 1, sequence_order: 30 }, // Fixed Anchor: Shipment - 1
        { name: 'Shipment', stage: 'Logistics', duration_days: 0, sequence_order: 31 } // Anchor: Delivery Date
    ];

    const taskInserts = tasks.map(t => ({
        template_id: templateId,
        ...t
    }));

    const { error: taskError } = await supabase
        .from('tna_template_tasks')
        .insert(taskInserts);

    if (taskError) {
        console.error('Error creating template tasks:', taskError);
    } else {
        console.log('Standard Export TNA Template created successfully.');
    }
};
