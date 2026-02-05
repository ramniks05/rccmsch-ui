import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WhatsNew, WhatsNewService } from 'src/app/core/services/whats-new.service';

@Component({
  selector: 'app-whats-new',
  templateUrl: './whats-new.component.html',
  styleUrls: ['./whats-new.component.scss']
})
export class WhatsNewComponent implements OnInit {
  list: WhatsNew[] = [];

  loading = false;
  saving = false;
  editId: number | null = null;

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private service: WhatsNewService,
    private snack: MatSnackBar
  ) {
    this.form = this.fb.group({
      publishedDate: ['', Validators.required],
      title: ['', Validators.required],
      pdfUrl: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  // ---------- LOAD ----------
  loadData(): void {
    this.loading = true;

    this.service.getAll().subscribe({
      next: (res) => {
        this.list = res.data ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Failed to load data', 'Close', { duration: 3000 });
      }
    });
  }

  // ---------- EDIT ----------
  edit(item: WhatsNew): void {
    this.editId = item.id!;
    this.form.patchValue({
      publishedDate: item.publishedDate,
      title: item.title,
      pdfUrl: item.pdfUrl
    });
  }

  // ---------- DELETE ----------
  delete(id: number): void {
    if (!confirm('Delete this item?')) return;

    this.service.delete(id).subscribe({
      next: () => {
        this.snack.open('Deleted successfully', 'Close', { duration: 2000 });
        this.loadData();
      },
      error: () => {
        this.snack.open('Delete failed', 'Close', { duration: 3000 });
      }
    });
  }

  // ---------- SAVE (CREATE / UPDATE) ----------
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const payload: WhatsNew = this.form.value;

    const request$ = this.editId
      ? this.service.update(this.editId, payload)
      : this.service.create(payload);

    request$.subscribe({
      next: () => {
        this.snack.open(
          this.editId ? 'Updated successfully' : 'Created successfully',
          'Close',
          { duration: 3000 }
        );
        this.reset();
        this.loadData();
        this.saving = false;
      },
      error: () => {
        this.saving = false;
        this.snack.open('Save failed', 'Close', { duration: 3000 });
      }
    });
  }

  // ---------- RESET ----------
  reset(): void {
    this.form.reset();
    this.editId = null;
  }
}
