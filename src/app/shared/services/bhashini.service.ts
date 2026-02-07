import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Bhashini Service
 * Integration with Government of India's Bhashini API
 * Provides Speech-to-Text, Translation, and Text-to-Speech
 */
@Injectable({
  providedIn: 'root'
})
export class BhashiniService {
  private bhashiniApiUrl = 'https://dhruva-api.bhashini.gov.in/services';
  private bhashiniUserId = ''; // To be configured
  private bhashiniApiKey = ''; // To be configured from environment

  // Supported language codes
  readonly languages = {
    english: 'en',
    hindi: 'hi',
    manipuri: 'mni', // Meitei/Manipuri
    bengali: 'bn',
    assamese: 'as',
    tamil: 'ta',
    telugu: 'te'
  };

  constructor(private http: HttpClient) {}

  /**
   * Configure Bhashini credentials
   */
  configure(userId: string, apiKey: string): void {
    this.bhashiniUserId = userId;
    this.bhashiniApiKey = apiKey;
  }

  /**
   * Get authorization headers
   */
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.bhashiniApiKey}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Speech-to-Text (ASR - Automatic Speech Recognition)
   * @param audioBlob - Audio file blob
   * @param sourceLanguage - Source language code (e.g., 'en', 'hi')
   */
  speechToText(audioBlob: Blob, sourceLanguage: string = 'en'): Observable<any> {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('sourceLanguage', sourceLanguage);
    formData.append('userId', this.bhashiniUserId);

    return this.http.post(`${this.bhashiniApiUrl}/inference/asr`, formData, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${this.bhashiniApiKey}`
      })
    }).pipe(
      catchError(error => {
        console.error('Bhashini ASR Error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Translate Text (NMT - Neural Machine Translation)
   * @param text - Text to translate
   * @param sourceLanguage - Source language code
   * @param targetLanguage - Target language code
   */
  translateText(text: string, sourceLanguage: string, targetLanguage: string): Observable<any> {
    const payload = {
      input: [{ source: text }],
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      userId: this.bhashiniUserId
    };

    return this.http.post(`${this.bhashiniApiUrl}/inference/translation`, payload, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => {
        console.error('Bhashini Translation Error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Text-to-Speech (TTS)
   * @param text - Text to convert to speech
   * @param language - Language code
   */
  textToSpeech(text: string, language: string = 'en'): Observable<any> {
    const payload = {
      input: [{ source: text }],
      sourceLanguage: language,
      userId: this.bhashiniUserId
    };

    return this.http.post(`${this.bhashiniApiUrl}/inference/tts`, payload, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => {
        console.error('Bhashini TTS Error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Check if Bhashini is configured
   */
  isConfigured(): boolean {
    return !!(this.bhashiniUserId && this.bhashiniApiKey);
  }

  /**
   * Get available language pairs for translation
   */
  getLanguagePairs(): { source: string; target: string; label: string }[] {
    return [
      { source: 'en', target: 'hi', label: 'English → Hindi' },
      { source: 'hi', target: 'en', label: 'Hindi → English' },
      { source: 'en', target: 'mni', label: 'English → Manipuri' },
      { source: 'mni', target: 'en', label: 'Manipuri → English' },
      { source: 'en', target: 'bn', label: 'English → Bengali' },
      { source: 'hi', target: 'mni', label: 'Hindi → Manipuri' }
    ];
  }
}
