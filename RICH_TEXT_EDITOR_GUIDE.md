# Rich Text Editor Integration Guide

## Overview
The rich text editor component with voice typing and translation capabilities has been successfully integrated into your Angular 16 application.

## What's Been Installed

### Packages Installed
```bash
quill@1.3.7                    # Rich text editor library
ngx-quill@16.2.1               # Angular wrapper for Quill
@types/quill@1.3.10            # TypeScript type definitions
```

### Files Created

1. **Service**: `src/app/shared/services/bhashini.service.ts`
   - Integrates with Bhashini API for Speech-to-Text and Translation
   - Handles API configuration and requests
   - Provides language pair mappings

2. **Component**: `src/app/shared/components/rich-text-editor/`
   - `rich-text-editor.component.ts` - Main component logic
   - `rich-text-editor.component.html` - Component template
   - `rich-text-editor.component.scss` - Component styles

3. **Documentation**: `BHASHINI_INTEGRATION.md`
   - Guide to obtain Bhashini API credentials
   - Configuration instructions
   - API endpoints reference

## Features Implemented

### ✅ Rich Text Editing
- Full-featured WYSIWYG editor with Quill
- Formatting options: bold, italic, underline, strikethrough
- Lists, headers, code blocks, quotes
- Text alignment, colors, fonts
- Link insertion

### ✅ Voice Typing (Web Speech API)
- Real-time speech-to-text
- Language support:
  - English (en-IN)
  - Hindi (hi-IN)
  - Manipuri (mni-IN)
- Browser-based (works in Chrome/Edge)
- Visual recording indicator

### ✅ Translation (Bhashini Integration Ready)
- Bhashini API integration prepared
- Translation language pairs:
  - English ↔ Hindi
  - English ↔ Manipuri
  - Hindi → English
  - And more regional languages
- Browser fallback (Google Translate) when API not configured

## How to Use

### Basic Usage

```typescript
// In your component template
<app-rich-text-editor
  [(content)]="yourContentVariable"
  [placeholder]="'Enter your content here...'"
  [height]="'500px'"
  (contentChange)="onContentChange($event)"
></app-rich-text-editor>
```

### With Forms (Reactive Forms)

```typescript
// In your component
import { FormBuilder, FormGroup } from '@angular/forms';

export class YourComponent {
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      content: ['']
    });
  }
}
```

```html
<!-- In your template -->
<form [formGroup]="form">
  <app-rich-text-editor formControlName="content"></app-rich-text-editor>
</form>
```

### Integration Examples

#### For Notice/Ordersheet/Judgment Forms

Replace existing textarea fields with the rich text editor:

**Before:**
```html
<mat-form-field>
  <textarea matInput formControlName="content"></textarea>
</mat-form-field>
```

**After:**
```html
<app-rich-text-editor formControlName="content"></app-rich-text-editor>
```

## Configuration Required

### Bhashini API Setup

1. **Get API Credentials**:
   - Visit: https://bhashini.gov.in/
   - Sign up and register your application
   - Obtain your User ID and API Key

2. **Configure Environment Variables**:

Edit `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  bhashini: {
    userId: 'YOUR_USER_ID_HERE',
    apiKey: 'YOUR_API_KEY_HERE'
  }
};
```

Edit `src/environments/environment.prod.ts`:
```typescript
export const environment = {
  production: true,
  bhashini: {
    userId: 'YOUR_PRODUCTION_USER_ID',
    apiKey: 'YOUR_PRODUCTION_API_KEY'
  }
};
```

3. **Update Bhashini Service**:

Edit `src/app/shared/services/bhashini.service.ts`:
```typescript
// Replace these lines
private bhashiniUserId = environment.bhashini?.userId || '';
private bhashiniApiKey = environment.bhashini?.apiKey || '';
```

## Features Breakdown

### Voice Typing
- Click microphone button to start/stop recording
- Select language from dropdown
- Real-time transcription appears in editor
- Works offline (browser-based)

### Translation
- Select translation direction (e.g., English to Hindi)
- Click "Translate" button
- Requires Bhashini API configuration
- Falls back to Google Translate if not configured

### Editor Features
- Character count display
- Clear content button
- Status indicators for recording/translating
- Responsive design
- Customizable height

## Browser Compatibility

### Voice Typing
- ✅ Chrome (recommended)
- ✅ Edge
- ❌ Firefox (limited support)
- ❌ Safari (not supported)

### Rich Text Editor
- ✅ All modern browsers

## Next Steps

1. **Obtain Bhashini Credentials** (if you want translation):
   - Visit https://bhashini.gov.in/
   - Complete registration process
   - Get User ID and API Key

2. **Configure Environment**:
   - Add credentials to environment files
   - Update BhashiniService

3. **Integrate into Forms**:
   - Replace textarea in Notice component
   - Replace textarea in Ordersheet component
   - Replace textarea in Judgment component

4. **Test Features**:
   - Test voice typing with different languages
   - Test translation (once configured)
   - Test rich text formatting

## Troubleshooting

### Voice Typing Not Working
- Check browser compatibility (use Chrome/Edge)
- Check microphone permissions
- Verify language selection

### Translation Not Working
- Verify Bhashini credentials are configured
- Check network connection
- Check browser console for API errors

### Editor Not Showing
- Verify SharedModule is imported in your module
- Check that Quill CSS is loaded (angular.json)
- Verify component is exported from SharedModule

## Support

For issues or questions:
1. Check browser console for errors
2. Verify all dependencies are installed
3. Ensure environment variables are configured
4. Review BHASHINI_INTEGRATION.md for API setup

## Technical Notes

- Quill version: 1.3.7 (compatible with Angular 16)
- ngx-quill version: 16.2.1
- Uses ControlValueAccessor for forms integration
- Supports both template-driven and reactive forms
- Responsive design with Material UI components
