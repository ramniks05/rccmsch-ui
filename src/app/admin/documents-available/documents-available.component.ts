import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { AdvancedSettingsService } from 'src/app/core/services/advanced-settings.service';

// Define the Document interface
export interface DocumentAvailable {
  id?: number;
  title: string;
  url: string;
  createdAt?: Date;
  publishedOn?: string;
}

// You'll need to create this service

@Component({
  selector: 'app-documents-available',
  templateUrl: './documents-available.component.html',
  styleUrls: ['./documents-available.component.scss'],
})
export class DocumentsAvailableComponent implements OnInit {
  displayedColumns = ['icon', 'title', 'type', 'document', 'actions'];
  dataSource = new MatTableDataSource<DocumentAvailable>([]);

  form: FormGroup;
  saving = false;
  editMode = false;
  editId: number | null = null;

  uploadType: 'file' | 'url' = 'file';
  selectedFile: File | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private fb: FormBuilder,
    private service: AdvancedSettingsService,
    private snack: MatSnackBar,
  ) {
    this.form = this.initForm();
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  /**
   * Initialize the form with validation
   */
  private initForm(): FormGroup {
    return this.fb.group({
      title: ['', Validators.required],
      uploadType: ['file'],
      url: [''],
      publishedOn: [],
    });
  }

  /**
   * Load all documents from service
   */
  loadData(): void {
    this.service.getAllDocumentsAvailable().subscribe({
      next: (res) => {
        this.dataSource.data = res.data ?? [];
      },
      error: (err) => {
        console.error('Error loading documents:', err);
        this.snack.open('Failed to load documents', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  /**
   * Handle upload type change
   */
  onUploadTypeChange(): void {
    this.uploadType = this.form.get('uploadType')?.value;

    // Reset validations and values
    const urlControl = this.form.get('url');

    if (this.uploadType === 'url') {
      // Clear file selection
      this.selectedFile = null;

      // Add URL validation
      urlControl?.setValidators([
        Validators.required,
        Validators.pattern(/^https?:\/\/.+/),
      ]);
    } else {
      // Remove URL validation for file upload
      urlControl?.clearValidators();
      urlControl?.setValue('');
    }

    urlControl?.updateValueAndValidity();
  }

  /**
   * Handle file selection
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        this.snack.open('File size exceeds 10MB limit', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar'],
        });
        return;
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png',
        'image/jpeg',
        'image/jpg',
      ];

      if (!allowedTypes.includes(file.type)) {
        this.snack.open(
          'Invalid file type. Please upload PDF, DOC, DOCX, PNG, or JPG files.',
          'Close',
          {
            duration: 4000,
            panelClass: ['error-snackbar'],
          },
        );
        return;
      }

      this.selectedFile = file;
    }
  }

  /**
   * Remove selected file
   */
  removeFile(): void {
    this.selectedFile = null;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get icon for file type
   */
  getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'pdf':
        return 'picture_as_pdf';
      case 'doc':
      case 'docx':
        return 'description';
      case 'png':
      case 'jpg':
      case 'jpeg':
        return 'image';
      default:
        return 'insert_drive_file';
    }
  }

  /**
   * Get document type from URL
   */
  getDocumentType(url: string): string {
    const ext = url.split('.').pop()?.toLowerCase().split('?')[0];

    switch (ext) {
      case 'pdf':
        return 'PDF';
      case 'doc':
      case 'docx':
        return 'DOC';
      case 'png':
      case 'jpg':
      case 'jpeg':
        return 'Image';
      default:
        return 'File';
    }
  }

  /**
   * Get document type class for styling
   */
  getDocumentTypeClass(url: string): string {
    const type = this.getDocumentType(url).toLowerCase();
    return `type-${type}`;
  }

  /**
   * Get icon for document in table
   */
  getDocumentIcon(url: string): string {
    const ext = url.split('.').pop()?.toLowerCase().split('?')[0];

    switch (ext) {
      case 'pdf':
        return 'picture_as_pdf';
      case 'doc':
      case 'docx':
        return 'description';
      case 'png':
      case 'jpg':
      case 'jpeg':
        return 'image';
      default:
        return 'insert_drive_file';
    }
  }

  /**
   * Check if document is PDF
   */
  isPDF(url: string): boolean {
    return url.toLowerCase().includes('.pdf');
  }

  /**
   * Save form (create or update)
   */
  save(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      this.snack.open('Please fill in all required fields correctly', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    // Validate file upload if type is file
    if (this.uploadType === 'file' && !this.selectedFile && !this.editMode) {
      this.snack.open('Please select a file to upload', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    this.saving = true;

    if (this.uploadType === 'file' && this.selectedFile) {
      // Upload file and get URL
      this.uploadFile();
    } else {
      // Use provided URL
      this.saveDocument();
    }
  }

  /**
   * Upload file to server
   */
  private uploadFile(): void {
    if (!this.selectedFile) return;

    const formData = new FormData();
    formData.append('title', this.form.get('title')?.value);
    formData.append('url', this.selectedFile);
    formData.append('publishedOn', '2026-02-10');

    this.service.uploadDocumentsAvailableFile(formData).subscribe({
      next: (response) => {
        // Assuming the response contains the uploaded file URL
        this.form.patchValue({ url: response.data.url });
        this.saveDocument();
      },
      error: (err) => {
        console.error('Error uploading file:', err);
        this.saving = false;
        this.snack.open('Failed to upload file', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  private saveDocument(): void {
    const formData = new FormData();

    formData.append('title', this.form.get('title')?.value);
    formData.append('url', this.form.get('url')?.value);
    formData.append('publishedOn', '2026-02-10');

    const request$ =
      this.editMode && this.editId
        ? this.service.updateDocumentsAvailable(this.editId, formData)
        : this.service.createDocumentsAvailable(formData);

    request$.subscribe({
      next: () => {
        this.snack.open(
          this.editMode
            ? 'Document updated successfully'
            : 'Document added successfully',
          'Close',
          { duration: 3000, panelClass: ['success-snackbar'] },
        );
        this.resetForm();
        this.loadData();
        this.saving = false;
      },
      error: (err) => {
        console.error('Error saving document:', err);
        this.saving = false;
        this.snack.open('Failed to save document', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  /**
   * Edit an existing document
   */
  edit(item: DocumentAvailable): void {
    this.editMode = true;
    this.editId = item.id!;

    // Determine if it's a URL or uploaded file
    // For simplicity, we'll assume it's a URL when editing
    this.uploadType = 'url';

    this.form.patchValue({
      title: item.title,
      uploadType: 'url',
      url: item.url,
      publishedOn: item.publishedOn ? new Date(item.publishedOn) : null,
    });

    this.onUploadTypeChange();

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });

    this.snack.open('Editing document - update and save when ready', 'Close', {
      duration: 2000,
    });
  }

  /**
   * Delete a document
   */
  delete(id: number): void {
    if (!id) return;

    const confirmed = confirm('Are you sure you want to delete this document?');
    if (!confirmed) return;

    this.service.deleteDocumentsAvailable(id).subscribe({
      next: () => {
        this.snack.open('Document deleted successfully', 'Close', {
          duration: 2000,
          panelClass: ['success-snackbar'],
        });

        if (this.editId === id) {
          this.cancelEdit();
        }

        this.loadData();
      },
      error: (err) => {
        console.error('Error deleting document:', err);
        this.snack.open('Failed to delete document', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  /**
   * Reset form to initial state
   */
  resetForm(): void {
    this.form.reset({
      uploadType: 'file',
    });
    this.editMode = false;
    this.editId = null;
    this.selectedFile = null;
    this.uploadType = 'file';
    this.onUploadTypeChange();
  }

  /**
   * Cancel edit mode
   */
  cancelEdit(): void {
    this.resetForm();
    this.snack.open('Edit cancelled', 'Close', { duration: 2000 });
  }

  /**
   * Mark all form controls as touched to show validation errors
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }
}
