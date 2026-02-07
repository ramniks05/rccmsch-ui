# How to Use Rich Text Editor Field Type

## Overview
The **RICH_TEXT** field type has been added to your form schema system. This allows you to add rich text editor fields (with voice typing and translation) to any module form.

## Where to Add RICH_TEXT Field

### For Module Forms (Hearing/Notice/Ordersheet/Judgment)

1. **Navigate to**: Admin Panel → Module Forms Configuration

2. **Select**:
   - Case Nature (e.g., "Civil")
   - Module Type (e.g., "NOTICE", "ORDERSHEET", "JUDGEMENT")
   - Optional: Case Type for override

3. **Add New Field**:
   - Click "Add Field" button
   - Fill in the field details:
     - **Field Name**: e.g., `noticeContent`, `judgmentContent`, `ordersheetContent`
     - **Field Label**: e.g., "Notice Content", "Judgment Content"
     - **Field Type**: Select **"Rich Text Editor (WYSIWYG)"** from dropdown
     - **Required**: Check if mandatory
     - **Placeholder**: e.g., "Enter notice content..."
     - **Help Text**: Optional instructions for the user

4. **Save** the field configuration

## Field Type Dropdown Options

When adding/editing a field, you'll see these options in the "Field Type" dropdown:

- Text
- Text Area
- **Rich Text Editor (WYSIWYG)** ← NEW!
- Number
- Date
- Date & Time
- Select (Dropdown)
- Multi-Select
- Checkbox
- Radio Button
- File Upload

## Example: Adding Rich Text to Notice Form

### Step-by-Step:

1. **Go to**: Admin → Module Forms → Configure Forms

2. **Select**:
   ```
   Case Nature: Civil
   Module Type: NOTICE
   ```

3. **Click "Add Field"** and enter:
   ```
   Field Name: noticeContent
   Field Label: Notice Content
   Field Type: Rich Text Editor (WYSIWYG)
   Required: Yes
   Placeholder: Enter the notice content here...
   Help Text: Use the toolbar to format text. Click the microphone icon for voice typing.
   Display Order: 1
   ```

4. **Click "Save Field"**

5. **Result**: When officers create a notice for a Civil case, they will see:
   - A full rich text editor with formatting toolbar
   - Voice typing button (microphone icon)
   - Translation options
   - Bold, italic, lists, colors, etc.

## Example: Adding Rich Text to Judgment Form

```
Field Name: judgmentContent
Field Label: Judgment Content
Field Type: Rich Text Editor (WYSIWYG)
Required: Yes
Placeholder: Enter the judgment details...
Help Text: Compose the judgment using the rich text editor. Use voice typing for faster input.
Display Order: 1
```

## How It Appears to Officers

### When Creating/Editing:

When an officer opens a case and needs to fill a form with RICH_TEXT field, they will see:

```
┌─────────────────────────────────────────────────┐
│ Notice Content *                                │
├─────────────────────────────────────────────────┤
│ 🎤 English ▼  │  Translate: [English to Hindi ▼] │
├─────────────────────────────────────────────────┤
│ [B] [I] [U] [Color] [List] [Link] ...         │ ← Formatting toolbar
├─────────────────────────────────────────────────┤
│                                                 │
│ [Type or speak your content here...]           │
│                                                 │
│                                                 │
│                                                 │
└─────────────────────────────────────────────────┘
   0 characters                    [Clear]
```

### Features Available:
- ✅ Rich text formatting (bold, italic, colors, fonts)
- ✅ Voice typing (English, Hindi, Manipuri)
- ✅ Translation between languages
- ✅ Lists, headings, quotes
- ✅ Links
- ✅ Character count

### When Viewing:
- Content is displayed with all formatting preserved
- Styled in a readable format
- HTML content rendered properly

## Where It Works

The RICH_TEXT field type works in:

### ✅ Module Forms:
- **Hearing Form** - e.g., hearing notes, observations
- **Notice Form** - e.g., notice content, instructions
- **Ordersheet Form** - e.g., order details, directives
- **Judgment Form** - e.g., judgment content, reasoning

### ✅ Configuration Pages:
- Module Forms Configuration (Admin)
- Form Schema Builder (Admin)

## Technical Details

### Field Type Code
```typescript
fieldType: 'RICH_TEXT'
```

### Stored Format
The content is stored as **HTML string** in the database:
```json
{
  "noticeContent": "<p><strong>To:</strong> All parties</p><p>This is to inform...</p>"
}
```

### Component Used
```html
<app-rich-text-editor
  [(content)]="formData[field.fieldName]"
  [placeholder]="field.placeholder"
  [height]="'400px'"
></app-rich-text-editor>
```

## Best Practices

### 1. When to Use RICH_TEXT vs TEXTAREA

**Use RICH_TEXT for:**
- Legal documents (notices, judgments, ordersheets)
- Content that needs formatting
- Long-form content
- Content that may be printed or exported
- Content requiring voice input

**Use TEXTAREA for:**
- Simple comments or remarks
- Short text inputs
- Unformatted notes
- Technical data

### 2. Recommended Fields for RICH_TEXT

#### Notice Module:
- `noticeContent` - Main notice text
- `additionalInstructions` - Extra instructions

#### Ordersheet Module:
- `ordersheetContent` - Order details
- `observations` - Court observations

#### Judgment Module:
- `judgmentContent` - Full judgment text
- `reasoning` - Legal reasoning
- `directions` - Court directions

#### Hearing Module:
- `hearingNotes` - Detailed hearing notes (if needed)

### 3. Field Configuration Tips

**Good Field Names:**
- Use camelCase: `noticeContent`, `judgmentText`
- Be descriptive: `mainJudgmentContent`, `preliminaryObservations`
- Avoid special characters

**Good Labels:**
- Clear and concise: "Notice Content", "Judgment Details"
- Include context if needed: "Main Judgment Content", "Additional Instructions"

**Helpful Placeholders:**
- "Enter the notice content here..."
- "Type or use voice input to compose the judgment..."
- "Document your observations and findings..."

**Useful Help Text:**
- "Use the formatting toolbar to style your text"
- "Click the microphone icon to use voice typing"
- "Use the translate button to convert between languages"

## Troubleshooting

### Issue: Field type dropdown doesn't show "Rich Text Editor"
**Solution**: Make sure you've updated the code and restarted the dev server.

### Issue: Rich text editor not showing in the form
**Solution**: 
1. Check that the field type is exactly `RICH_TEXT`
2. Verify SharedModule is imported in the module
3. Clear browser cache and reload

### Issue: Content not saving
**Solution**: 
1. Check that the field is bound correctly with `[(content)]`
2. Verify the form data model includes the field name
3. Check browser console for errors

## Migration Guide

### Converting Existing TEXTAREA Fields to RICH_TEXT

If you have existing TEXTAREA fields that you want to convert:

1. **Backup your data** (important!)

2. **Update the field type** in the database:
   ```sql
   UPDATE module_form_fields 
   SET field_type = 'RICH_TEXT' 
   WHERE field_name = 'noticeContent' 
   AND case_nature_id = 1 
   AND module_type = 'NOTICE';
   ```

3. **Existing plain text data** will still work - it will just be displayed without formatting

4. **New entries** will support rich formatting

### Data Compatibility
- Plain text data works in RICH_TEXT fields (displayed as-is)
- HTML data from RICH_TEXT fields works in both editor and view mode
- You can safely convert TEXTAREA → RICH_TEXT
- Converting RICH_TEXT → TEXTAREA will keep HTML tags (not recommended)

## Quick Reference

| Aspect | Details |
|--------|---------|
| **Field Type Code** | `RICH_TEXT` |
| **Display Name** | Rich Text Editor (WYSIWYG) |
| **Icon** | 📝 article |
| **Data Format** | HTML string |
| **Component** | `<app-rich-text-editor>` |
| **Modules** | Hearing, Notice, Ordersheet, Judgment |
| **Features** | Formatting, Voice, Translation |
| **Browser Support** | All modern browsers |

## Summary

✅ **What you can do now:**
1. Add RICH_TEXT field type in Module Forms configuration
2. Officers can use rich text editor with voice typing and translation
3. Content is stored as formatted HTML
4. Works in all module forms (Hearing, Notice, Ordersheet, Judgment)

✅ **Where to find it:**
- Admin Panel → Module Forms → Select Case Nature & Module Type
- Click "Add Field" → Select "Rich Text Editor (WYSIWYG)" from Field Type dropdown

✅ **What officers will see:**
- Full rich text editor with formatting toolbar
- Voice typing button for speech-to-text
- Translation options
- Professional document composition interface

---

**Ready to use!** Go to your Admin Panel → Module Forms and start adding Rich Text Editor fields to your forms.
