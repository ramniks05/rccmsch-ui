import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import {
  AdvancedSettingsService,
  WhatsNew
} from 'src/app/core/services/advanced-settings.service';

@Component({
  selector: 'app-whats-new',
  templateUrl: './whats-new.component.html',
  styleUrls: ['./whats-new.component.scss']
})
export class WhatsNewComponent implements OnInit {

  displayedColumns = ['publishedDate', 'title', 'pdf', 'actions'];
  dataSource = new MatTableDataSource<WhatsNew>([]);

  form: FormGroup;
  saving = false;
  editMode = false;
  editId: number | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private fb: FormBuilder,
    private service: AdvancedSettingsService,
    private snack: MatSnackBar
  ) {
    this.form = this.initForm();
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  /* =====================
     FORM
  ===================== */

  private initForm(): FormGroup {
    return this.fb.group({
      publishedDate: ['', Validators.required],
      title: ['', Validators.required],
      pdfUrl: ['', Validators.required]
    });
  }

  /* =====================
     LOAD DATA
  ===================== */

  loadData(): void {
    this.service.getAllWhatsNew().subscribe({
      next: (res) => {
        this.dataSource.data = res.data ?? [];
      },
      error: (err) => {
        console.error('Error loading data:', err);
        this.snack.open('Failed to load announcements', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  /* =====================
     SAVE (CREATE / UPDATE)
  ===================== */

  save(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      this.snack.open('Please fill in all required fields', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.saving = true;
    const payload: WhatsNew = this.form.value;

    const request$ =
      this.editMode && this.editId
        ? this.service.updateWhatsNew(this.editId, payload)
        : this.service.createWhatsNew(payload);

    request$.subscribe({
      next: () => {
        this.snack.open(
          this.editMode
            ? 'Entry updated successfully'
            : 'Entry added successfully',
          'Close',
          {
            duration: 3000,
            panelClass: ['success-snackbar']
          }
        );

        this.resetForm();
        this.loadData();
        this.saving = false;
      },
      error: (err) => {
        console.error('Error saving:', err);
        this.saving = false;
        this.snack.open('Failed to save entry', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  /* =====================
     EDIT
  ===================== */

  edit(item: WhatsNew): void {
    this.editMode = true;
    this.editId = item.id!;

    this.form.patchValue({
      publishedDate: item.publishedDate,
      title: item.title,
      pdfUrl: item.pdfUrl
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    this.snack.open('Editing entry — update and save', 'Close', {
      duration: 2000
    });
  }

  /* =====================
     DELETE
  ===================== */

  delete(id: number): void {
    if (!id) return;

    if (!confirm('Are you sure you want to delete this entry?')) return;

    this.service.deleteWhatsNew(id).subscribe({
      next: () => {
        this.snack.open('Entry deleted successfully', 'Close', {
          duration: 2000,
          panelClass: ['success-snackbar']
        });

        if (this.editId === id) {
          this.cancelEdit();
        }

        this.loadData();
      },
      error: (err) => {
        console.error('Error deleting:', err);
        this.snack.open('Failed to delete entry', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  /* =====================
     HELPERS
  ===================== */

  resetForm(): void {
    this.form.reset();
    this.editMode = false;
    this.editId = null;
  }

  cancelEdit(): void {
    this.resetForm();
    this.snack.open('Edit cancelled', 'Close', { duration: 2000 });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control =>
      control.markAsTouched()
    );
  }
}
