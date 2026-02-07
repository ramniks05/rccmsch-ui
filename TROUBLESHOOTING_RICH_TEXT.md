# ⚠️ RICH_TEXT Field Type Not Showing - Troubleshooting Guide

## ✅ Verification Completed

The code has been verified and **RICH_TEXT is correctly added** to your system:
- ✅ Type definition updated in `module-forms.service.ts`
- ✅ Field type added to dropdown array in `module-forms.component.ts`
- ✅ Label mapping added: "Rich Text Editor (WYSIWYG)"
- ✅ Icon added for rich text fields
- ✅ Form schema builder updated
- ✅ Hearing form component updated to render the editor

## 🔧 Solution: Restart Your Dev Server

The most common reason the field type isn't showing is that **your development server needs to be restarted** to pick up the TypeScript changes.

### Method 1: Restart Dev Server (Recommended)

**Step 1: Stop the Server**
- Find your terminal running `npm start` or `ng serve`
- Press `Ctrl+C` to stop it
- Or close the terminal

**Step 2: Clear Cache**
```powershell
Remove-Item -Path ".angular" -Recurse -Force -ErrorAction SilentlyContinue
```

**Step 3: Start Fresh**
```powershell
npm start
```

**Step 4: Clear Browser Cache**
- Open the application in your browser
- Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac) to hard reload
- Or open Developer Tools (F12) → Network tab → Check "Disable cache"

### Method 2: Full Clean Restart

If the above doesn't work, do a complete clean build:

```powershell
# 1. Stop the dev server (Ctrl+C)

# 2. Remove build cache
Remove-Item -Path ".angular" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue

# 3. Reinstall dependencies (if needed)
npm install

# 4. Start dev server
npm start
```

### Method 3: Manual Verification

If still not showing, let's verify manually:

**Check 1: File Content**
Open: `src/app/admin/module-forms/module-forms.component.ts`

Look for this code around line 25-28:
```typescript
fieldTypes: FieldType[] = [
  'TEXT', 'TEXTAREA', 'RICH_TEXT', 'NUMBER', 'DATE', 'DATETIME', 
  'SELECT', 'MULTISELECT', 'CHECKBOX', 'RADIO', 'FILE'
];
```

If `'RICH_TEXT'` is there, the code is correct.

**Check 2: Type Definition**
Open: `src/app/admin/services/module-forms.service.ts`

Look for this code around line 14:
```typescript
export type FieldType = 'TEXT' | 'TEXTAREA' | 'RICH_TEXT' | 'NUMBER' | 'DATE' | 'DATETIME' | 'SELECT' | 'MULTISELECT' | 'CHECKBOX' | 'RADIO' | 'FILE';
```

If `'RICH_TEXT'` is there, the type is correct.

**Check 3: Label Mapping**
In the same `module-forms.component.ts` file, look for the `getFieldTypeLabel` method around line 326:

```typescript
getFieldTypeLabel(fieldType: FieldType): string {
  const labels: Record<FieldType, string> = {
    'TEXT': 'Text',
    'TEXTAREA': 'Text Area',
    'RICH_TEXT': 'Rich Text Editor (WYSIWYG)',  // ← Should be here
    'NUMBER': 'Number',
    // ... rest
  };
  return labels[fieldType] || fieldType;
}
```

## 🎯 Where to Look for the Field Type

After restarting, go to:
1. **Admin Panel** → **Module Forms** → **Configure Forms**
2. Select a **Case Nature** (e.g., "Civil")
3. Select a **Module Type** (e.g., "NOTICE")
4. Click **"Add Field"** button
5. Look at the **"Field Type"** dropdown

You should see:
```
Field Type: [Select ▼]
  ├─ Text
  ├─ Text Area
  ├─ Rich Text Editor (WYSIWYG)  ← THIS ONE!
  ├─ Number
  ├─ Date
  ├─ Date & Time
  ├─ Select (Dropdown)
  ├─ Multi-Select
  ├─ Checkbox
  ├─ Radio Button
  └─ File Upload
```

## 🐛 Still Not Showing?

### Check Browser Console

1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for any **red errors**
4. Take a screenshot and check:
   - TypeScript compilation errors
   - Module import errors
   - Component errors

### Check Terminal Output

1. Look at your terminal running the dev server
2. Check for:
   - **Compilation errors** (red text)
   - **Module not found** errors
   - **Type errors**

### Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| TypeScript error: "Type 'RICH_TEXT' is not assignable..." | Restart dev server, clear .angular cache |
| Dropdown shows old values | Hard refresh browser (Ctrl+Shift+R) |
| Module compilation error | Run `npm install` then restart |
| Import errors | Check that all imports are correct in component |

## 📸 Visual Guide: What You Should See

### Before Restart (Old):
```
Field Type:
  ├─ Text
  ├─ Text Area        ← Only these old types
  ├─ Number
  └─ ...
```

### After Restart (New):
```
Field Type:
  ├─ Text
  ├─ Text Area
  ├─ Rich Text Editor (WYSIWYG)  ← NEW! This should appear
  ├─ Number
  └─ ...
```

## ✅ Quick Test

After restarting, test if it works:

1. **Go to**: Admin → Module Forms
2. **Select**: Any Case Nature + NOTICE module
3. **Click**: "Add Field"
4. **Check**: Field Type dropdown
5. **Expected**: You should see "Rich Text Editor (WYSIWYG)" in the list

If you see it: ✅ **Success!**
If not: ❌ Check the troubleshooting steps above

## 🆘 Last Resort

If nothing works:

1. **Take screenshots** of:
   - The Field Type dropdown (what you actually see)
   - Browser console errors (F12 → Console tab)
   - Terminal output (where dev server is running)

2. **Check these files** contain the updates:
   ```
   src/app/admin/services/module-forms.service.ts (line 14)
   src/app/admin/module-forms/module-forms.component.ts (line 25-28, line 329)
   src/app/admin/form-schema-builder/form-schema-builder.component.ts (line 73-84)
   ```

3. **Verify** by searching for "RICH_TEXT" in your project:
   ```powershell
   # Run this in terminal:
   Get-ChildItem -Recurse -Filter "*.ts" | Select-String "RICH_TEXT"
   ```
   
   You should see results from multiple files.

## 💡 Expected Outcome

After proper restart, when you:
- Navigate to Module Forms
- Click "Add Field"
- Open Field Type dropdown

You will see **"Rich Text Editor (WYSIWYG)"** as an option, between "Text Area" and "Number".

---

**TL;DR: Restart your dev server with cache clear, then hard refresh your browser!**

```powershell
# Stop server (Ctrl+C), then run:
Remove-Item -Path ".angular" -Recurse -Force -ErrorAction SilentlyContinue
npm start
# Then hard refresh browser: Ctrl+Shift+R
```
