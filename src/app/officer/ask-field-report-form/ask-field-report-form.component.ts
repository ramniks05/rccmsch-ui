import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ModuleFormsService, ModuleFormField } from '../../admin/services/module-forms.service';
import { OfficerCaseService } from '../services/officer-case.service';

@Component({
  selector: 'app-ask-field-report-form',
  templateUrl: './ask-field-report-form.component.html',
  styleUrls: ['./ask-field-report-form.component.scss']
})
export class AskFieldReportFormComponent implements OnInit {
  @Input() caseId!: number;
  @Output() formSubmitted = new EventEmitter<void>();

  form!: FormGroup;
  fields: ModuleFormField[] = [];
  loading = false;
  submitting = false;
  fieldOfficers: any[] = [];

  // localStorage key for ASK_FIELD_REPORT fields
  private readonly STORAGE_KEY = 'ASK_FIELD_REPORT_FIELDS';

  constructor(
    private fb: FormBuilder,
    private moduleFormsService: ModuleFormsService,
    private caseService: OfficerCaseService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadFormFields();
  }

  /**
   * Load ASK_FIELD_REPORT form fields from localStorage or service
   */
  loadFormFields(): void {
    this.loading = true;

    const storedData = localStorage.getItem(this.STORAGE_KEY);
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        if (parsed && parsed.fields && Array.isArray(parsed.fields)) {
          this.fields = parsed.fields;
          this.initializeForm();
          this.loadFieldOfficers();
          this.loading = false;
          return;
        }
      } catch (error) {
        console.error('Error parsing localStorage data:', error);
      }
    }

    // Fallback: fetch from service if localStorage is empty or invalid
    const caseNatureId = 4; // Using default MUTATION_CASE for dummy data

    this.moduleFormsService.getFieldsByCaseNatureAndModule(
      caseNatureId,
      'REQUEST_FIELD_REPORT'
    ).subscribe({
      next: (response) => {
        this.fields = response.data || [];
        this.initializeForm();
        this.loadFieldOfficers();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading form fields:', error);
        this.snackBar.open('Failed to load form fields', 'Close', { duration: 4000 });
        this.loading = false;
      }
    });
  }

  /**
   * Initialize form group with fields
   */
  initializeForm(): void {
    const formControls: any = {};

    this.fields.forEach(field => {
      const validators = [];
      if (field.isRequired) {
        validators.push(Validators.required);
      }

      formControls[field.fieldName] = ['', validators];
    });

    this.form = this.fb.group(formControls);
  }

  /**
   * Load field officers list
   */
  loadFieldOfficers(): void {
    this.fieldOfficers = [
      { id: 1, name: 'Officer 1' },
      { id: 2, name: 'Officer 2' },
      { id: 3, name: 'Officer 3' }
    ];
  }

  /**
   * Get field by name
   */
  getField(fieldName: string): ModuleFormField | undefined {
    return this.fields.find(f => f.fieldName === fieldName);
  }

  /**
   * Submit the form
   */
  submitForm(): void {
    if (!this.form.valid) {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 4000 });
      return;
    }

    this.submitting = true;
    const formData = this.form.value;

    // Save the form data using submitModuleForm method
    this.caseService.submitModuleForm(this.caseId, 'ASK_FIELD_REPORT', formData).subscribe({
      next: () => {
        this.snackBar.open('Ask Field Report submitted successfully', 'Close', { duration: 4000 });
        this.submitting = false;
        this.formSubmitted.emit();
      },
      error: (error: any) => {
        console.error('Error submitting form:', error);
        this.snackBar.open('Failed to submit form', 'Close', { duration: 4000 });
        this.submitting = false;
      }
    });
  }
}
