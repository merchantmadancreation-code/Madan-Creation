import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/"/g, '');
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/"/g, '');
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDash() {
  const { data: poData } = await supabase.from('production_orders').select('id, order_no');
  const { data: dprData } = await supabase.from('dpr_logs').select('order_no, production_stage, actual_produced');

  const dprMap = {};
  dprData?.forEach(log => {
      if (!log.order_no) return;
      if (!dprMap[log.order_no]) dprMap[log.order_no] = { cutting: 0, stitching: 0, finishing: 0, packing: 0 };
      if (log.production_stage === 'Cutting') {
          dprMap[log.order_no].cutting += (Number(log.actual_produced) || 0);
      }
      if (log.production_stage === 'Stitching') {
          dprMap[log.order_no].stitching += (Number(log.actual_produced) || 0);
      }
  });

  const consolidated = poData?.map(po => {
      const logs = dprMap[po.order_no] || { cutting: 0, stitching: 0, finishing: 0, packing: 0 };
      return {
          po_number: po.order_no,
          cutting: logs.cutting,
          stitching: logs.stitching
      };
  });

  console.log("Calculated Dashboard:");
  console.log(consolidated.find(c => c.po_number === '01402/RDPOR/JP'));
}
testDash();
