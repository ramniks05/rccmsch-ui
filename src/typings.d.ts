// Type declarations for html-docx-js
declare module 'html-docx-js/dist/html-docx' {
  interface ConversionOptions {
    orientation?: 'portrait' | 'landscape';
    margins?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
  }

  function asBlob(html: string, options?: ConversionOptions): Blob;
  
  export { asBlob, ConversionOptions };
}

// Type declarations for file-saver
declare module 'file-saver' {
  export function saveAs(blob: Blob, filename: string): void;
}
