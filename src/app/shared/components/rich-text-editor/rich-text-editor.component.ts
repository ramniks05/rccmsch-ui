import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, forwardRef, AfterViewInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BhashiniService } from '../../services/bhashini.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { QuillEditorComponent } from 'ngx-quill';

/**
 * Rich Text Editor with Voice Typing and Translation
 * Integrates Quill Editor with Bhashini API
 */
@Component({
  selector: 'app-rich-text-editor',
  templateUrl: './rich-text-editor.component.html',
  styleUrls: ['./rich-text-editor.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true
    }
  ]
})
export class RichTextEditorComponent implements OnInit, OnDestroy, AfterViewInit, ControlValueAccessor {
  @Input() content: string = '';
  @Input() placeholder: string = 'Enter content here...';
  @Input() height: string = '400px';
  @Output() contentChange = new EventEmitter<string>();

  @ViewChild('editor') editorComponent!: QuillEditorComponent;

  // ControlValueAccessor properties
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  // Voice Recording
  isRecording = false;
  recognition: any = null;
  selectedLanguage = 'en'; // Default: English
  private quillEditor: any = null; // Quill editor instance

  // Translation
  isTranslating = false;
  translationLanguages: { source: string; target: string; label: string }[] = [];
  selectedTranslation = '';

  // Quill Configuration
  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'header': 1 }, { 'header': 2 }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }],
      [{ 'align': [] }],
      ['clean'],
      ['link']
    ]
  };

  // Voice languages
  voiceLanguages = [
    { code: 'en-IN', label: 'English' },
    { code: 'hi-IN', label: 'Hindi' },
    { code: 'mni-IN', label: 'Manipuri' }
  ];

  constructor(
    private bhashiniService: BhashiniService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeSpeechRecognition();
    this.translationLanguages = this.bhashiniService.getLanguagePairs();
  }

  ngAfterViewInit(): void {
    // Get Quill editor instance after view init
    if (this.editorComponent && this.editorComponent.quillEditor) {
      this.quillEditor = this.editorComponent.quillEditor;
      
      // Track cursor position
      this.quillEditor.on('selection-change', (range: any) => {
        if (range) {
          // Store cursor position when user clicks/selects
          this.quillEditor.savedRange = range;
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  /**
   * Initialize Web Speech API
   */
  private initializeSpeechRecognition(): void {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-IN';

    let finalTranscript = '';

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Insert at cursor position in Quill editor
      if (finalTranscript && this.quillEditor) {
        // Get current cursor position or use saved range
        const range = this.quillEditor.getSelection() || this.quillEditor.savedRange;
        const cursorIndex = range ? range.index : this.quillEditor.getLength();
        
        // Insert text at cursor position
        this.quillEditor.insertText(cursorIndex, finalTranscript);
        
        // Move cursor to end of inserted text
        this.quillEditor.setSelection(cursorIndex + finalTranscript.length);
        
        // Update content
        this.content = this.quillEditor.root.innerHTML;
        this.contentChange.emit(this.content);
        
        finalTranscript = '';
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.isRecording = false;
      this.showMessage('Voice recognition error. Please try again.', 'error');
    };

    this.recognition.onend = () => {
      this.isRecording = false;
    };
  }

  /**
   * Toggle voice recording
   */
  toggleVoiceRecording(): void {
    if (!this.recognition) {
      this.showMessage('Speech recognition not supported in this browser. Please use Chrome or Edge.', 'error');
      return;
    }

    if (this.isRecording) {
      this.recognition.stop();
      this.isRecording = false;
      this.showMessage('Voice recording stopped', 'info');
    } else {
      this.recognition.lang = this.selectedLanguage;
      this.recognition.start();
      this.isRecording = true;
      this.showMessage('Listening... Speak now', 'success');
    }
  }

  /**
   * Change voice language
   */
  changeVoiceLanguage(language: string): void {
    this.selectedLanguage = language;
    if (this.isRecording) {
      this.recognition.stop();
      setTimeout(() => {
        this.recognition.lang = language;
        this.recognition.start();
      }, 100);
    }
  }

  /**
   * Translate content using Bhashini
   */
  translateContent(): void {
    if (!this.content || !this.selectedTranslation) {
      this.showMessage('Please enter content and select translation language', 'error');
      return;
    }

    if (!this.bhashiniService.isConfigured()) {
      this.showMessage('Bhashini API not configured. Using browser fallback.', 'warning');
      this.translateWithBrowserAPI();
      return;
    }

    const [source, target] = this.selectedTranslation.split('-');
    this.isTranslating = true;

    this.bhashiniService.translateText(this.stripHtml(this.content), source, target).subscribe({
      next: (response) => {
        this.isTranslating = false;
        if (response && response.output && response.output[0]?.target) {
          this.content = response.output[0].target;
          this.contentChange.emit(this.content);
          this.showMessage('Translation completed successfully', 'success');
        }
      },
      error: (error) => {
        this.isTranslating = false;
        console.error('Translation error:', error);
        this.showMessage('Translation failed. Please try again.', 'error');
      }
    });
  }

  /**
   * Browser-based translation fallback (opens Google Translate)
   */
  private translateWithBrowserAPI(): void {
    const text = this.stripHtml(this.content);
    const [source, target] = this.selectedTranslation.split('-');
    const url = `https://translate.google.com/?sl=${source}&tl=${target}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    this.showMessage('Opening Google Translate in new tab', 'info');
  }

  /**
   * Strip HTML tags for translation
   */
  private stripHtml(html: string): string {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  /**
   * Quill editor created event
   */
  onEditorCreated(quill: any): void {
    this.quillEditor = quill;
    
    // Track cursor position when user clicks or selects text
    quill.on('selection-change', (range: any) => {
      if (range) {
        quill.savedRange = range;
      }
    });
  }

  /**
   * Content changed
   */
  onContentChanged(event: any): void {
    this.contentChange.emit(this.content);
    this.onChange(this.content);
  }

  /**
   * ControlValueAccessor implementation
   */
  writeValue(value: string): void {
    this.content = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    // Handle disabled state if needed
  }

  /**
   * Show snackbar message
   */
  private showMessage(message: string, type: 'success' | 'error' | 'info' | 'warning'): void {
    const config: any = {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    };

    if (type === 'error') {
      config.panelClass = ['error-snackbar'];
    } else if (type === 'success') {
      config.panelClass = ['success-snackbar'];
    }

    this.snackBar.open(message, 'Close', config);
  }

  /**
   * Clear content
   */
  clearContent(): void {
    if (confirm('Are you sure you want to clear all content?')) {
      this.content = '';
      this.contentChange.emit(this.content);
      this.showMessage('Content cleared', 'info');
    }
  }

  /**
   * Insert template text
   */
  insertTemplate(template: string): void {
    this.content = (this.content || '') + template;
    this.contentChange.emit(this.content);
  }
}
