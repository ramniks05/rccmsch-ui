# Document Templates with Rich Text Editor & Word Export

## 🎉 What's New

Your document template system now includes:

✅ **Rich Text Editor** (replacing plain HTML textarea)
✅ **Voice Typing** (English, Hindi, Manipuri)
✅ **Translation** (Multiple Indian languages)
✅ **Word Document Export** (.docx format)
✅ **Placeholder Support** (Dynamic content)

## 📍 Where to Find It

**Admin Panel → Document Templates → Configure Templates**

1. Select **Case Nature** (e.g., "Civil")
2. Select **Document Type** (Notice, Ordersheet, or Judgement)
3. Click **"Add Template"**

## 🎨 What You'll See Now

### New Template Editor Interface

```
┌─────────────────────────────────────────────────────────┐
│ Template Content *                                      │
│ ℹ️ Use Rich Text Editor with Voice Typing & Translation│
│ [Preview as Word]                                       │
├─────────────────────────────────────────────────────────┤
│ 🎤 [English ▼] │ Translate: [Select ▼] [Translate]    │
│ ────────────────────────────────────────────────────────│
│ [B][I][U][Color][Font][List]... (Formatting Toolbar)   │
│ ────────────────────────────────────────────────────────│
│                                                         │
│ Type your template here or use voice typing...         │
│                                                         │
│ Insert placeholders: {{caseNumber}} {{applicantName}}  │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
  [{{caseNumber}}] [{{applicantName}}] [{{courtName}}]...
  Click to insert dynamic placeholders
```

## 🚀 Features Explained

### 1. Rich Text Formatting
- **Bold, Italic, Underline** - Format important text
- **Colors & Fonts** - Customize appearance
- **Lists & Headings** - Structure your document
- **Text Alignment** - Left, center, right, justify

### 2. Voice Typing 🎤
Click the microphone icon and speak:
- **English** - "To whom it may concern..."
- **Hindi** - "यह नोटिस इस बात की जानकारी देने के लिए..."
- **Manipuri** - Speak in Manipuri, text appears automatically

### 3. Translation 🌐
- Type in one language
- Select translation pair
- Click "Translate"
- Content converts to target language

### 4. Word Export 📄
**Two ways to get Word documents:**

#### Option A: Preview While Editing
Click **"Preview as Word"** button while editing template
- Downloads: `Preview_NOTICE_timestamp.docx`
- Test your template before saving

#### Option B: Export Saved Template
From the template list, click the **Word icon** (📄) button
- Downloads: `Your_Template_Name.docx`
- Perfect formatting preserved

### 5. Dynamic Placeholders
Click these buttons to insert:
- `{{caseNumber}}` - Case registration number
- `{{applicantName}}` - Applicant's name
- `{{caseNature}}` - Civil/Criminal, etc.
- `{{caseType}}` - Case type details
- `{{courtName}}` - Court name
- `{{officerName}}` - Officer's name
- `{{currentDate}}` - Today's date
- `{{subject}}` - Case subject
- `{{description}}` - Case description

## 📝 How to Create a Template

### Step 1: Navigate
- Admin Panel → Document Templates
- Select Case Nature (e.g., "Civil")
- Select Document Type (e.g., "NOTICE")

### Step 2: Add Template
Click **"Add Template"** button

### Step 3: Fill Details
```
Template Name: Official Notice Template
Version: 1
☑️ Active
☑️ Allow Edit After Sign
```

### Step 4: Create Content

**Option A: Type Manually**
Use the rich text editor like Microsoft Word:
- Type your content
- Format with toolbar
- Add placeholders by clicking buttons

**Option B: Use Voice Typing**
1. Click microphone icon
2. Select language
3. Speak your content
4. Text appears automatically

**Option C: Translate Existing**
1. Type in English
2. Select translation (e.g., "English to Hindi")
3. Click "Translate"
4. Review and edit if needed

### Step 5: Preview
Click **"Preview as Word"** to see how it will look

### Step 6: Save
Click **"Create Template"** or **"Update Template"**

## 💡 Example Templates

### Example 1: Notice Template

**Content:**
```
OFFICIAL NOTICE

Date: {{currentDate}}
Case Number: {{caseNumber}}

To: {{applicantName}}

This is to inform you that your application regarding {{subject}} 
under case number {{caseNumber}} has been reviewed.

The matter is scheduled for hearing. You are required to appear 
before {{courtName}} on the specified date.

Please bring all relevant documents.

Signed,
{{officerName}}
{{courtName}}
```

**With Voice Typing:**
1. Click 🎤
2. Say: "Official Notice. Date: [click {{currentDate}} button]. Case Number..."
3. Format as needed
4. Export as Word

### Example 2: Judgement Template

**Content with Formatting:**
```
[Bold, Large Font] JUDGEMENT [/Bold]

Case Number: {{caseNumber}}
Date: {{currentDate}}

[Bold] Parties: [/Bold]
Applicant: {{applicantName}}

[Bold] Subject: [/Bold]
{{subject}}

[Bold] Facts of the Case: [/Bold]
{{description}}

[Bold] Decision: [/Bold]
[Use voice typing or write your judgement here with full formatting]

[Bold] Reasoning: [/Bold]
[Detailed reasoning with formatting]

[Signature]
{{officerName}}
{{courtName}}
```

## 🎯 Best Practices

### 1. Template Structure
✅ **Use Headings** for sections
✅ **Bold important information**
✅ **Use placeholders** for dynamic content
✅ **Keep consistent formatting**

### 2. Voice Typing Tips
✅ Speak clearly and slowly
✅ Use punctuation commands: "comma", "period", "new paragraph"
✅ Edit and format after voice input
✅ Switch languages as needed

### 3. Translation Tips
✅ Review translated content
✅ Adjust formatting after translation
✅ Legal terms may need manual correction
✅ Use bilingual templates when needed

### 4. Word Export Tips
✅ Preview before saving
✅ Check formatting in Word document
✅ Test placeholders are properly placed
✅ Verify margins and spacing

## 🔧 Word Export Details

### What Gets Exported
- ✅ All text content
- ✅ Bold, italic, underline
- ✅ Colors and fonts
- ✅ Lists and headings
- ✅ Text alignment
- ✅ Placeholders (preserved)

### File Format
- **Format**: Microsoft Word (.docx)
- **Orientation**: Portrait
- **Margins**: Standard (0.75 inches all sides)
- **Compatibility**: Word 2010 and later

### File Naming
- **From Editor**: `Preview_NOTICE_1707317920.docx`
- **From Template**: `Your_Template_Name.docx`

## 🎬 Quick Demo Flow

1. **Admin** → **Document Templates**
2. Select **Civil** → **NOTICE**
3. Click **Add Template**
4. Name: "Civil Notice Template"
5. **Use Voice**: Click 🎤 → Say "This is an official notice to {{applicantName}}"
6. **Insert Placeholders**: Click buttons to add {{caseNumber}}, {{courtName}}
7. **Format**: Make heading bold, add lists
8. **Preview**: Click "Preview as Word" → Downloads .docx
9. **Save**: Click "Create Template"
10. **Later**: Click Word icon to export again

## 📱 Common Actions

| Action | How To |
|--------|--------|
| Add formatting | Use toolbar (Bold, Italic, etc.) |
| Voice type | Click 🎤, select language, speak |
| Translate | Type → Select language pair → Click Translate |
| Insert placeholder | Click placeholder button below editor |
| Preview as Word | Click "Preview as Word" button |
| Export template | Click 📄 icon on template card |
| Edit template | Click ✏️ (Edit) button |

## ❓ Troubleshooting

### Voice Typing Not Working
- Use Chrome or Edge browser
- Check microphone permissions
- Select correct language

### Translation Not Working
- Check if Bhashini API is configured
- Falls back to Google Translate
- Review translated content

### Word Export Issues
- If export fails, check template content
- Remove any broken HTML if copied from elsewhere
- Try "Preview as Word" first

### Placeholders Not Showing in Word
- Placeholders are preserved as {{text}}
- They'll be replaced when document is generated for actual case
- This is correct behavior

## 🎓 Training Tips

### For Admins
1. Create templates with proper formatting
2. Test voice typing in different languages
3. Preview as Word before finalizing
4. Keep templates updated

### For Officers (When Using Templates)
1. Templates appear when creating Notice/Ordersheet/Judgement
2. Content is pre-filled from template
3. Placeholders are replaced with actual case data
4. Can edit and add more content
5. Export final document as Word

## 📊 Summary

| Feature | Status | Benefit |
|---------|--------|---------|
| Rich Text Editor | ✅ Active | Professional formatting |
| Voice Typing | ✅ Active | Faster content creation |
| Translation | ✅ Active | Multi-language support |
| Word Export | ✅ Active | Standard document format |
| Placeholders | ✅ Active | Dynamic content |

---

## 🚀 Ready to Use!

Go to **Admin Panel → Document Templates** and start creating professional templates with:
- Rich text formatting
- Voice typing support
- Translation capabilities  
- Word document export

**Your templates will now be created in Word format instead of plain HTML!** 🎉
