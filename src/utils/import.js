import * as XLSX from 'xlsx';

export const parseInventoryExcel = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                const parsedItems = jsonData.map(row => {
                    // Map headers to schema keys
                    // Expected Headers: 'Item Name', 'Fabric Code', 'HSN Code', 'Description', 'Material Type', 'Opening Stock', 'Unit', 'Standard Purchase Rate', 'Rate Type'

                    const name = row['Item Name'] || row['Name'];
                    if (!name) return null; // Skip empty rows

                    return {
                        name: name,
                        fabricCode: row['Fabric Code'] || '',
                        hsnCode: row['HSN Code'] || '',
                        description: row['Description'] || '',
                        materialType: row['Material Type'] || 'Fabric',
                        openingStock: parseFloat(row['Opening Stock']) || 0,
                        unit: row['Unit'] || 'Meter',
                        rate: parseFloat(row['Item Rate']) || parseFloat(row['Standard Purchase Rate']) || parseFloat(row['Rate']) || 0,
                        rateType: row['Rate Type'] || 'Per Meter'
                    };
                }).filter(item => item !== null);

                resolve(parsedItems);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};
