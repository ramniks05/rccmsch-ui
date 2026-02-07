# Bhashini Integration Guide

## What is Bhashini?

**Bhashini** (भाषिणी) is the **Government of India's National Language Translation Mission** platform that provides:
- ✅ **Speech-to-Text (ASR)** - Automatic Speech Recognition
- ✅ **Text Translation (NMT)** - Neural Machine Translation
- ✅ **Text-to-Speech (TTS)** - Audio generation
- ✅ **FREE for Government Departments**

## Supported Languages

- English (en)
- Hindi (hi)
- Manipuri/Meitei (mni)
- Bengali (bn)
- Assamese (as)
- Tamil (ta)
- Telugu (te)
- And 20+ other Indian languages

## How to Get Bhashini API Access

### Step 1: Register on Bhashini Portal
1. Visit: **https://bhashini.gov.in/ulca/**
2. Click on **"Sign Up"** or **"Register"**
3. Use your **Government Email ID** (mandatory for government users)
4. Fill organization details:
   - Organization: Revenue & Settlement Department, Government of Manipur
   - Designation: Your designation
   - Purpose: Court Case Management System

### Step 2: Get API Credentials
1. After registration, login to Bhashini portal
2. Go to **"API Access"** or **"Credentials"** section
3. You will receive:
   - **User ID** (ulca-user-xxxxx)
   - **API Key** (long token string)
4. Save these credentials securely

### Step 3: Configure in Your Application

Add to environment file: `src/environments/environment.ts`

\`\`\`typescript
export const environment = {
  production: false,
  bhashini: {
    userId: 'YOUR_BHASHINI_USER_ID',
    apiKey: 'YOUR_BHASHINI_API_KEY',
    apiUrl: 'https://dhruva-api.bhashini.gov.in/services'
  }
};
\`\`\`

### Step 4: API Endpoints Used

Our integration uses these Bhashini endpoints:
- **ASR (Speech-to-Text)**: `/inference/asr`
- **NMT (Translation)**: `/inference/translation`
- **TTS (Text-to-Speech)**: `/inference/tts`

## Features Implemented

### 1. Rich Text Editor (Quill)
- ✅ Bold, Italic, Underline, Strike-through
- ✅ Headers (H1-H6)
- ✅ Lists (ordered/unordered)
- ✅ Text alignment
- ✅ Font size and color
- ✅ Links and blockquotes

### 2. Voice Typing (Web Speech API + Bhashini)
- ✅ Click microphone button to start recording
- ✅ Real-time transcription
- ✅ Supports English, Hindi, Manipuri
- ✅ Browser-based (Chrome/Edge)
- ✅ Fallback to Bhashini ASR if configured

### 3. Translation (Bhashini NMT)
- ✅ English → Hindi/Manipuri/Regional
- ✅ Hindi → English/Manipuri
- ✅ One-click translation
- ✅ Preserves formatting
- ✅ Fallback to Google Translate if Bhashini not configured

## Usage in Components

### For Notice, Ordersheet, Judgment:

\`\`\`html
<app-rich-text-editor
  [(content)]="noticeContent"
  [placeholder]="'Enter notice content...'"
  [height]="'500px'"
  (contentChange)="onContentChange($event)"
></app-rich-text-editor>
\`\`\`

## Important Notes

1. **Voice Recognition**: Currently uses browser's Web Speech API (free, works offline)
2. **Translation**: Will use Bhashini API once configured, otherwise opens Google Translate
3. **API Key Security**: Store in environment files, never commit to git
4. **Government Priority**: Bhashini approval is fast for government departments

## Next Steps

1. ✅ Rich Text Editor - IMPLEMENTED
2. ✅ Voice Typing - IMPLEMENTED (Browser API)
3. ⏳ Bhashini Integration - NEEDS API CREDENTIALS
4. ⏳ Configure environment variables

Once you receive Bhashini credentials, update the environment file and the service will automatically start using Bhashini APIs!

## Contact for Bhashini Support

- Portal: https://bhashini.gov.in
- Email: support@bhashini.gov.in
- Documentation: https://bhashini.gitbook.io/bhashini-apis/
