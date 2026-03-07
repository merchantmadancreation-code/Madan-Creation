d# TSC TE244 Barcode Printer Setup Guide

## Label Specifications
- **Label Size**: 100mm x 50mm (10cm x 5cm)
- **Printer Model**: TSC TE244
- **Print Method**: Direct Thermal / Thermal Transfer
- **Resolution**: 203 DPI

## Browser Print Settings

### Step 1: Open Print Dialog
1. Click "Print Labels" button in the application
2. Press `Ctrl + P` or use browser's print menu

### Step 2: Configure Print Settings

#### **Printer Selection**
- Select: `TSC TE244` from printer list

#### **Page Setup**
- **Paper Size**: Custom
  - Width: `100mm` (or `3.94 inches`)
  - Height: `50mm` (or `1.97 inches`)
- **Orientation**: Portrait
- **Margins**: None (0mm all sides)
- **Scale**: 100% (Do NOT scale to fit)

#### **Advanced Settings**
- **Print Quality**: Best/Highest
- **Color**: Black & White (Grayscale)
- **Paper Type**: Labels
- **Print on Both Sides**: OFF

### Step 3: TSC Printer Driver Settings

#### **Basic Tab**
- **Media Type**: Label (Gap)
- **Print Speed**: Medium (4-6 IPS recommended)
- **Print Darkness**: 10-12 (adjust based on label quality)
- **Label Width**: 100mm
- **Label Height**: 50mm

#### **Advanced Tab**
- **Print Mode**: Tear-off
- **Sensor Type**: Gap sensor
- **Gap/Black Mark**: 2-3mm (standard gap between labels)
- **Offset**: 0mm

#### **Options Tab**
- **Tear-off Position**: 0 to +5 (adjust for easy removal)
- **Print Direction**: Normal
- **Mirror Image**: OFF

## Windows Printer Configuration

### Method 1: Control Panel Setup
1. Open `Control Panel` → `Devices and Printers`
2. Right-click `TSC TE244` → `Printing Preferences`
3. Set the following:
   - **Page Setup**:
     - Paper Size: `100mm x 50mm` (create custom if not available)
     - Orientation: Portrait
   - **Stock**:
     - Media Type: Label
     - Width: 100mm
     - Height: 50mm
     - Gap: 2mm
   - **Print Quality**:
     - Speed: 152mm/s (6 IPS)
     - Darkness: 10

### Method 2: Create Custom Paper Size
1. Go to `Control Panel` → `Devices and Printers`
2. Click `Print Server Properties` (top menu)
3. Check `Create a new form`
4. Enter:
   - Form name: `Label 100x50mm`
   - Width: `10.00 cm`
   - Height: `5.00 cm`
   - Margins: All `0.00 cm`
5. Click `Save Form`
6. Select this custom form in printer preferences

## Calibration

### Auto-Calibration (Recommended)
1. Load labels in the printer
2. Turn off the printer
3. Hold the `FEED` button and turn on the printer
4. Release when printer starts feeding labels
5. Printer will auto-detect label size and gap

### Manual Calibration via Utility
1. Open `TSC Console` or `BarTender UltraLite` software
2. Connect to printer
3. Run `Sensor Calibration`
4. Follow on-screen instructions

## Troubleshooting

### Issue: Labels printing blank
**Solution**: Increase print darkness to 12-15

### Issue: Labels skipping or misaligned
**Solution**: 
- Run auto-calibration
- Check gap sensor is clean
- Verify gap setting matches actual label gap (usually 2-3mm)

### Issue: Barcode not scanning
**Solution**:
- Increase barcode width in application (currently set to 1.2)
- Ensure print darkness is 10-12
- Use high-quality thermal labels

### Issue: Content cut off
**Solution**:
- Verify custom paper size is exactly 100mm x 50mm
- Ensure margins are set to 0mm
- Check "Scale to fit" is disabled

## Recommended Label Specifications

### For Best Results Use:
- **Material**: Direct Thermal Paper (if no ribbon) or Thermal Transfer (with ribbon)
- **Adhesive**: Permanent acrylic
- **Core Size**: 40mm (1.5")
- **Roll Diameter**: Up to 127mm (5")
- **Labels per Roll**: 500-1000
- **Gap**: 2-3mm between labels

### Recommended Suppliers:
- Zebra Direct Thermal Labels (Z-Select 2000D)
- TSC Genuine Labels
- Avery Thermal Labels

## Application-Specific Settings

The web application is already configured for:
- Page size: 10cm x 5cm
- Margins: 0.2cm internal padding
- Barcode: Code 128, width 1.2, height 28px
- Font sizes: Optimized for 203 DPI printing

## Testing Checklist

Before production printing:
- [ ] Print 1 test label
- [ ] Verify barcode scans correctly
- [ ] Check all text is readable
- [ ] Ensure no content is cut off
- [ ] Verify label peels off cleanly
- [ ] Test with actual barcode scanner

## Support

For TSC TE244 specific issues:
- TSC Support: https://www.tscprinters.com/support
- Driver Downloads: https://www.tscprinters.com/drivers
- User Manual: Included with printer or download from TSC website
