# Quick Start: Adding Rich Text Editor Field

## 🎯 Simple 4-Step Guide

### Step 1: Go to Module Forms Configuration
Navigate to: **Admin Panel** → **Module Forms** → **Configure Forms**

### Step 2: Select Your Configuration
Choose:
- **Case Nature**: e.g., "Civil", "Criminal"
- **Module Type**: Choose where you want the editor:
  - `HEARING` - For hearing notes
  - `NOTICE` - For notice content ✅ (Most common)
  - `ORDERSHEET` - For order sheet content ✅ (Most common)
  - `JUDGEMENT` - For judgment content ✅ (Most common)

### Step 3: Add Rich Text Field
Click **"Add Field"** button and fill in:

```
┌─────────────────────────────────────────┐
│ Field Name: judgmentContent             │
│ Field Label: Judgment Content           │
│ Field Type: [Rich Text Editor (WYSIWYG)]│ ← SELECT THIS!
│ Required: [✓] Yes                       │
│ Placeholder: Enter judgment details...  │
│ Help Text: Use voice typing for faster  │
│            input                         │
│ Display Order: 1                        │
└─────────────────────────────────────────┘
```

### Step 4: Save
Click **"Save Field"** and you're done!

## 📍 Where to Find the Field Type Dropdown

When you click "Add Field", you'll see a form. Look for **"Field Type"** dropdown:

```
Field Type: [Select field type ▼]
            │
            ├─ Text
            ├─ Text Area
            ├─ Rich Text Editor (WYSIWYG) ← CLICK THIS ONE!
            ├─ Number
            ├─ Date
            ├─ Date & Time
            ├─ Select (Dropdown)
            ├─ Multi-Select
            ├─ Checkbox
            ├─ Radio Button
            └─ File Upload
```

## 🎨 What Officers Will See

When an officer fills out the form, they'll see:

```
┌────────────────────────────────────────────────┐
│ Judgment Content *                             │
│                                                │
│ Toolbar:                                       │
│ [🎤] [English ▼] | Translate: [Select ▼] [→]  │
│ ────────────────────────────────────────────── │
│ [B] [I] [U] [S] [Color] [▼Font] [List]...     │
│ ────────────────────────────────────────────── │
│                                                │
│ Type your judgment here or click the           │
│ microphone to use voice typing...              │
│                                                │
│                                                │
│                                                │
└────────────────────────────────────────────────┘
  500 characters                        [Clear]
```

## 💡 Common Use Cases

### Use Case 1: Notice Content
```
Field Name: noticeContent
Field Label: Notice Content
Field Type: Rich Text Editor (WYSIWYG)
Required: Yes
```

### Use Case 2: Judgment Content
```
Field Name: judgmentContent
Field Label: Judgment Content
Field Type: Rich Text Editor (WYSIWYG)
Required: Yes
```

### Use Case 3: Order Sheet Details
```
Field Name: ordersheetContent
Field Label: Order Sheet Details
Field Type: Rich Text Editor (WYSIWYG)
Required: Yes
```

## ✅ Features Your Officers Get

1. **Rich Text Formatting**
   - Bold, Italic, Underline
   - Colors and fonts
   - Lists and headings
   - Text alignment

2. **Voice Typing** 🎤
   - Click microphone icon
   - Speak in English, Hindi, or Manipuri
   - Text appears automatically

3. **Translation** 🌐
   - Type in one language
   - Translate to another
   - Supports multiple Indian languages

4. **Professional Document**
   - Print-ready formatting
   - Export with styles
   - View mode preserves formatting

## 🚀 Try It Now!

1. **Login to Admin Panel**
2. **Go to**: Module Forms → Configure Forms
3. **Select**: Case Nature: "Civil", Module Type: "NOTICE"
4. **Click**: "Add Field"
5. **Select**: Field Type: "Rich Text Editor (WYSIWYG)"
6. **Fill in**:
   - Field Name: `testRichText`
   - Field Label: `Test Rich Text`
   - Field Type: `Rich Text Editor (WYSIWYG)`
7. **Save**
8. **Test**: Go to an officer case → Create Notice → You'll see the editor!

## 📱 Need Help?

**Can't find the field type?**
- Make sure the dev server is restarted
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)

**Editor not showing?**
- Check the field type is exactly "RICH_TEXT" in database
- Verify the module imports SharedModule

**Want to see it in action?**
- Add a field to NOTICE module
- Open any case as an officer
- Create a new notice
- You'll see the rich text editor!

---

**That's it!** You now have a powerful rich text editor with voice typing and translation in your forms! 🎉
