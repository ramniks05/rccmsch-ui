import { Component, OnInit, Inject, ChangeDetectorRef, OnDestroy, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../admin.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { catchError } from 'rxjs/operators';
import { throwError, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Form Field Definition Interface
 */
export interface FormFieldDefinition {
  id?: number;
  caseTypeId?: number;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  isRequired: boolean;
  validationRules?: string;
  displayOrder: number;
  isActive: boolean;
  defaultValue?: string;
  fieldOptions?: string;
  placeholder?: string;
  helpText?: string;
  fieldGroup?: string; // Group code (e.g., "deed_details", "applicant_info") - references FormFieldGroup.groupCode
  // Note: groupLabel and groupDisplayOrder are now managed in master field groups table (FormFieldGroup)
  conditionalLogic?: string;
  version?: number; // For conflict prevention
  createdAt?: string;
  updatedAt?: string;
  // Internal property for sanitized field name (used in preview)
  __sanitizedFieldName?: string;
}

/**
 * Form Schema Interface
 */
export interface FormSchema {
  caseTypeId: number;
  caseTypeName: string;
  caseTypeCode: string;
  totalFields: number;
  fields: FormFieldDefinition[];
}

/**
 * Form Schema Builder Component
 * Admin tool to create and manage dynamic form schemas for case types
 */
@Component({
  selector: 'app-form-schema-builder',
  templateUrl: './form-schema-builder.component.html',
  styleUrls: ['./form-schema-builder.component.scss']
})
export class FormSchemaBuilderComponent implements OnInit, OnDestroy {
  formSchema: FormSchema | null = null;
  previewForm: FormGroup = this.fb.group({});
  loading = false;
  saving = false;
  error: string | null = null;
  caseTypeId: number | null = null;
  caseTypeName: string = '';
  showPreview = false;
  previewFormReady = false; // true only after buildPreviewForm() has run (avoids binding before controls exist)
  fieldGroups: any[] = []; // Master field groups for this case type
  private sortedFieldsCache: FormFieldDefinition[] = [];
  private flatFieldsListCache: Array<{ type: 'group'; groupLabel: string; groupCode: string } | { type: 'field'; field: FormFieldDefinition; schemaIndex: number; sortedIndex: number }> = [];
  private destroy$ = new Subject<void>();
  private fieldsChanged = true; // Flag to track if fields changed
  fieldTypes = [
    { value: 'TEXT', label: 'Text' },
    { value: 'NUMBER', label: 'Number' },
    { value: 'DATE', label: 'Date' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'PHONE', label: 'Phone' },
    { value: 'TEXTAREA', label: 'Textarea' },
    { value: 'SELECT', label: 'Dropdown' },
    { value: 'RADIO', label: 'Radio Buttons' },
    { value: 'CHECKBOX', label: 'Checkbox' },
    { value: 'FILE', label: 'File Upload' }
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.caseTypeId = +params['caseTypeId'];
        if (this.caseTypeId) {
          this.loadFormSchema(this.caseTypeId);
          this.loadFieldGroups(this.caseTypeId);
        }
      });
  }

  /**
   * Load field groups for the case type
   */
  loadFieldGroups(caseTypeId: number): void {
    this.adminService.getFieldGroups(caseTypeId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading field groups:', error);
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          const apiResponse = response?.success !== undefined ? response : { success: true, data: response };
          if (apiResponse.success) {
            this.fieldGroups = apiResponse.data || [];
            console.log('Field groups loaded:', this.fieldGroups.length);
          }
        },
        error: () => {
          // Error already handled in catchError
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load form schema from backend
   * Form schemas are now linked to Case Type (not Case Nature)
   * GET /api/admin/form-schemas/case-types/{caseTypeId} — Public endpoint (no auth required)
   */
  loadFormSchema(caseTypeId: number): void {
    this.loading = true;
    this.error = null;

    this.adminService.getFormSchema(caseTypeId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.loading = false;
          // If schema doesn't exist yet (404), create empty schema
          if (error.status === 404) {
            this.initializeEmptySchema();
            return throwError(() => error);
          }
          // For other errors, show error but still try to get case type name
          this.handleError(error);
          this.initializeEmptySchema();
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.error = null; // Clear any errors
          const apiResponse = response?.success !== undefined ? response : { success: true, data: response };
          if (apiResponse.success && apiResponse.data) {
            this.formSchema = apiResponse.data;
            if (this.formSchema) {
              this.caseTypeName = this.formSchema.caseTypeName || this.formSchema.caseTypeCode || 'Case Type';
              
              // Ensure fields are sorted by displayOrder
              if (this.formSchema.fields && this.formSchema.fields.length > 0) {
                this.formSchema.fields.sort((a, b) => a.displayOrder - b.displayOrder);
              }
              
              // Reset preview state when schema loads
              this.showPreview = false;
              this.previewFormReady = false;
              this.previewForm = this.fb.group({}, { emitEvent: false });
              this.sortedFieldsCache = [];
              this.fieldsChanged = true;
            }
          } else {
            this.initializeEmptySchema();
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Initialize empty schema if none exists
   */
  initializeEmptySchema(): void {
    // Get case type name from Case Types API
    // Form schemas are now linked to Case Type (not Case Nature)
    if (this.caseTypeId && !isNaN(this.caseTypeId)) {
      this.loading = true;
      this.loadCaseTypeNameFromList();
    } else {
      // No caseTypeId - should not happen but handle gracefully
      this.error = 'Case type ID is missing or invalid';
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Open dialog to add/edit field
   */
  openFieldDialog(field?: FormFieldDefinition): void {
    try {
      // Ensure formSchema exists
      if (!this.formSchema) {
        this.snackBar.open('Please wait for the form schema to load.', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        return;
      }

      // Ensure field groups are loaded - reload if empty
      if ((!this.fieldGroups || this.fieldGroups.length === 0) && this.caseTypeId) {
        this.loadFieldGroups(this.caseTypeId);
      }

      // Store the original field reference for later comparison
      // Create a deep copy to preserve the original field data
      const originalField = field ? {
        id: field.id,
        fieldName: field.fieldName,
        fieldLabel: field.fieldLabel,
        fieldType: field.fieldType,
        fieldGroup: field.fieldGroup,
        displayOrder: field.displayOrder,
        isRequired: field.isRequired,
        isActive: field.isActive,
        placeholder: field.placeholder,
        helpText: field.helpText,
        defaultValue: field.defaultValue,
        fieldOptions: field.fieldOptions,
        validationRules: field.validationRules
      } : null;

      const dialogRef = this.dialog.open(FormFieldDialogComponent, {
        width: '700px',
        disableClose: false,
        data: {
          field: originalField,
          fieldTypes: this.fieldTypes,
          nextDisplayOrder: this.getNextDisplayOrder(),
          caseTypeId: this.caseTypeId,
          fieldGroups: this.fieldGroups || [],
          adminService: this.adminService
        }
      });

      dialogRef.afterClosed()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            if (result) {
              // Reload field groups in case a new one was created
              if (this.caseTypeId) {
                this.loadFieldGroups(this.caseTypeId);
              }
              
              if (originalField && originalField.fieldName) {
                // Update existing field - find index using the original field
                const actualIndex = this.getFieldIndex(originalField);
                if (actualIndex >= 0) {
                  this.updateField(actualIndex, result);
                } else {
                  this.snackBar.open('Field not found. Please refresh and try again.', 'Close', {
                    duration: 3000,
                    panelClass: ['error-snackbar']
                  });
                }
              } else {
                // Add new field
                this.addField(result);
              }
            }
          },
          error: (error) => {
            console.error('Error in dialog afterClosed subscription:', error);
            this.snackBar.open('An error occurred. Please try again.', 'Close', {
              duration: 3000,
              panelClass: ['error-snackbar']
            });
          }
        });
    } catch (error) {
      console.error('Error opening field dialog:', error);
      this.snackBar.open('Failed to open field dialog. Please try again.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    }
  }

  /**
   * Add new field to schema
   */
  addField(field: FormFieldDefinition): void {
    if (!this.formSchema || !this.caseTypeId) return;
    
    // Ensure unique field name
    if (this.isFieldNameExists(field.fieldName)) {
      this.snackBar.open('Field name already exists. Please use a unique name.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Set display order if not set
    if (!field.displayOrder) {
      field.displayOrder = this.getNextDisplayOrder();
    }

    // Prepare field data for API
    // Form schemas are now linked to Case Type
    const fieldData: any = {
      caseTypeId: this.caseTypeId, // Backend expects caseTypeId
      fieldName: field.fieldName,
      fieldLabel: field.fieldLabel,
      fieldType: field.fieldType,
      isRequired: field.isRequired || false,
      displayOrder: field.displayOrder,
      isActive: field.isActive !== undefined ? field.isActive : true,
      defaultValue: field.defaultValue || null,
      placeholder: field.placeholder || null,
      helpText: field.helpText || null,
      fieldGroup: field.fieldGroup || null,
      // Note: groupLabel and groupDisplayOrder are now managed in master field groups table
      fieldOptions: field.fieldOptions || null,
      conditionalLogic: null,
      validationRules: field.validationRules || null
    };

    // Call API to create field
    this.loading = true;
    this.adminService.createFormField(fieldData)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.loading = false;
          const errorMessage = error.error?.message || error.message || 'Failed to create field';
          this.snackBar.open(errorMessage, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          this.loading = false;
          const apiResponse = response?.success !== undefined ? response : { success: true, data: response };
          if (apiResponse.success && apiResponse.data && this.formSchema && this.formSchema.fields) {
            // Add the created field (with ID from backend) to the schema
            this.formSchema.fields.push(apiResponse.data);
            this.formSchema.totalFields = this.formSchema.fields.length;
            this.fieldsChanged = true;
            this.sortFields();
            
            this.snackBar.open('Field created successfully', 'Close', {
              duration: 2000
            });
            
            // Rebuild preview form if preview is active
            if (this.showPreview) {
              setTimeout(() => {
                this.buildPreviewForm();
              }, 0);
            }
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Update existing field
   */
  updateField(index: number, field: FormFieldDefinition): void {
    if (!this.formSchema || !this.caseTypeId || !this.formSchema.fields) {
      this.snackBar.open('Form schema not available', 'Close', { duration: 3000 });
      return;
    }
    
    // Validate index
    if (index < 0 || index >= this.formSchema.fields.length) {
      this.snackBar.open('Field not found. Please refresh and try again.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }
    
    const oldField = this.formSchema.fields[index];
    
    if (!oldField) {
      this.snackBar.open('Field not found', 'Close', { duration: 3000 });
      return;
    }
    
    // Check if field name changed and if new name already exists
    if (oldField.fieldName !== field.fieldName && this.isFieldNameExists(field.fieldName)) {
      this.snackBar.open('Field name already exists. Please use a unique name.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // If field has an ID, it exists on backend - update it
    if (oldField.id) {
      // Prepare update data (only include changed fields)
      const updateData: any = {
        fieldLabel: field.fieldLabel,
        fieldType: field.fieldType,
        isRequired: field.isRequired,
        displayOrder: field.displayOrder,
        isActive: field.isActive,
        defaultValue: field.defaultValue || null,
        placeholder: field.placeholder || null,
        helpText: field.helpText || null,
        fieldGroup: field.fieldGroup || null,
      // Note: groupLabel and groupDisplayOrder are now managed in master field groups table
        fieldOptions: field.fieldOptions || null,
        validationRules: field.validationRules || null
      };

      // Include expectedVersion if field has version (for conflict prevention)
      if ((oldField as any).version !== undefined) {
        updateData.expectedVersion = (oldField as any).version;
      }

      this.loading = true;
      this.adminService.updateFormField(oldField.id, updateData)
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            this.loading = false;
            let errorMessage = 'Failed to update field';
            
            if (error.status === 409) {
              errorMessage = 'Field was modified by another user. Please refresh and try again.';
            } else if (error.error?.message) {
              errorMessage = error.error.message;
            }
            
            this.snackBar.open(errorMessage, 'Close', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
            
            // Reload schema on conflict
            if (error.status === 409 && this.caseTypeId) {
              this.loadFormSchema(this.caseTypeId);
            }
            
            return throwError(() => error);
          })
        )
        .subscribe({
          next: (response) => {
            this.loading = false;
            const apiResponse = response?.success !== undefined ? response : { success: true, data: response };
            if (apiResponse.success && apiResponse.data && this.formSchema && this.formSchema.fields) {
              // Update the field with response data (includes new version)
              this.formSchema.fields[index] = apiResponse.data;
            } else if (this.formSchema && this.formSchema.fields) {
              // Fallback: update locally
              this.formSchema.fields[index] = field;
            }
            this.fieldsChanged = true;
            this.sortFields();
            
            this.snackBar.open('Field updated successfully', 'Close', {
              duration: 2000
            });
            
            // Rebuild preview form if preview is active
            if (this.showPreview) {
              setTimeout(() => {
                this.buildPreviewForm();
              }, 0);
            }
            this.cdr.markForCheck();
          },
          error: () => {
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
    } else {
      // Field doesn't have ID yet - treat as new field
      this.addField(field);
    }
  }

  /**
   * Delete field from schema
   */
  deleteField(index: number): void {
    if (!this.formSchema || !this.caseTypeId || !this.formSchema.fields) {
      this.snackBar.open('Form schema not available', 'Close', { duration: 3000 });
      return;
    }
    
    if (index < 0 || index >= this.formSchema.fields.length) {
      this.snackBar.open('Invalid field index', 'Close', { duration: 3000 });
      return;
    }
    
    const field = this.formSchema.fields[index];
    if (!field) {
      this.snackBar.open('Field not found', 'Close', { duration: 3000 });
      return;
    }
    
    // If field has an ID, delete from backend
    if (field.id) {
      this.loading = true;
      this.adminService.deleteFormField(field.id)
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            this.loading = false;
            const errorMessage = error.error?.message || error.message || 'Failed to delete field';
            this.snackBar.open(errorMessage, 'Close', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
            return throwError(() => error);
          })
        )
        .subscribe({
          next: (response) => {
            this.loading = false;
            const apiResponse = response?.success !== undefined ? response : { success: true };
            if (apiResponse.success && this.formSchema && this.formSchema.fields) {
              // Remove field from local schema
              this.formSchema.fields.splice(index, 1);
              this.formSchema.totalFields = this.formSchema.fields.length;
              this.fieldsChanged = true;
              
              // Clear sorted cache
              this.sortedFieldsCache = [];
              
              this.snackBar.open('Field deleted successfully', 'Close', {
                duration: 2000
              });
              
              // Rebuild preview form if preview is active
              if (this.showPreview) {
                setTimeout(() => {
                  this.buildPreviewForm();
                }, 0);
              }
            }
            this.cdr.markForCheck();
          },
          error: () => {
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
    } else {
      // Field doesn't have ID - just remove locally (wasn't saved yet)
      if (this.formSchema && this.formSchema.fields) {
        this.formSchema.fields.splice(index, 1);
        this.formSchema.totalFields = this.formSchema.fields.length;
        this.fieldsChanged = true;
        
        // Clear sorted cache
        this.sortedFieldsCache = [];
        
        this.snackBar.open('Field removed', 'Close', {
          duration: 2000
        });
      }
      
      // Rebuild preview form if preview is active
      if (this.showPreview) {
        setTimeout(() => {
          this.buildPreviewForm();
        }, 0);
      }
      this.cdr.markForCheck();
    }
  }

  /**
   * Move field up in order
   */
  moveFieldUp(index: number): void {
    if (index === 0 || !this.formSchema || !this.caseTypeId || !this.formSchema.fields) return;
    
    if (index < 0 || index >= this.formSchema.fields.length) return;
    
    const sortedFields = this.getSortedFields();
    if (index >= sortedFields.length) return;
    
    // Swap display orders
    const tempOrder = sortedFields[index].displayOrder;
    sortedFields[index].displayOrder = sortedFields[index - 1].displayOrder;
    sortedFields[index - 1].displayOrder = tempOrder;
    
    // Update the actual fields in formSchema
    const field1 = this.formSchema.fields.find(f => 
      (f.id && sortedFields[index].id && f.id === sortedFields[index].id) ||
      (!f.id && f.fieldName === sortedFields[index].fieldName)
    );
    const field2 = this.formSchema.fields.find(f => 
      (f.id && sortedFields[index - 1].id && f.id === sortedFields[index - 1].id) ||
      (!f.id && f.fieldName === sortedFields[index - 1].fieldName)
    );
    
    if (field1) field1.displayOrder = sortedFields[index].displayOrder;
    if (field2) field2.displayOrder = sortedFields[index - 1].displayOrder;
    
    // Sort with new orders
    this.formSchema.fields.sort((a, b) => a.displayOrder - b.displayOrder);
    this.fieldsChanged = true;
    this.sortedFieldsCache = [];
    
    // Update order on backend
    this.updateFieldOrder();
    
    this.cdr.markForCheck();
  }

  /**
   * Move field down in order
   */
  moveFieldDown(index: number): void {
    if (!this.formSchema || !this.caseTypeId || !this.formSchema.fields) return;
    
    const sortedFields = this.getSortedFields();
    if (index < 0 || index >= sortedFields.length - 1) return;
    
    // Swap display orders
    const tempOrder = sortedFields[index].displayOrder;
    sortedFields[index].displayOrder = sortedFields[index + 1].displayOrder;
    sortedFields[index + 1].displayOrder = tempOrder;
    
    // Update the actual fields in formSchema
    const field1 = this.formSchema.fields.find(f => 
      (f.id && sortedFields[index].id && f.id === sortedFields[index].id) ||
      (!f.id && f.fieldName === sortedFields[index].fieldName)
    );
    const field2 = this.formSchema.fields.find(f => 
      (f.id && sortedFields[index + 1].id && f.id === sortedFields[index + 1].id) ||
      (!f.id && f.fieldName === sortedFields[index + 1].fieldName)
    );
    
    if (field1) field1.displayOrder = sortedFields[index].displayOrder;
    if (field2) field2.displayOrder = sortedFields[index + 1].displayOrder;
    
    // Sort with new orders
    this.formSchema.fields.sort((a, b) => a.displayOrder - b.displayOrder);
    this.fieldsChanged = true;
    this.sortedFieldsCache = [];
    
    // Update order on backend
    this.updateFieldOrder();
    
    this.cdr.markForCheck();
  }

  /**
   * Update field order on backend
   */
  private updateFieldOrder(): void {
    if (!this.formSchema || !this.caseTypeId) return;
    
    // Prepare field orders for API
    const fieldOrders = this.formSchema.fields
      .filter(field => field.id) // Only include fields that exist on backend
      .map((field, index) => ({
        fieldId: field.id!,
        displayOrder: field.displayOrder
      }));

    if (fieldOrders.length === 0) return;

    // Call API to reorder fields for Case Type
    this.adminService.reorderFields(this.caseTypeId, fieldOrders)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Failed to update field order:', error);
          // Don't show error to user - order is updated locally anyway
          return throwError(() => error);
        })
      )
      .subscribe({
        next: () => {
          // Order updated successfully
          console.log('Field order updated successfully');
        },
        error: () => {
          // Silent failure - order is already updated locally
        }
      });
  }

  /**
   * Sort fields by display order
   */
  sortFields(): void {
    if (!this.formSchema) return;
    this.formSchema.fields.sort((a, b) => a.displayOrder - b.displayOrder);
    // Don't update display orders here - only when actually reordering
  }

  /**
   * Update display orders to be sequential
   */
  updateDisplayOrders(): void {
    if (!this.formSchema) return;
    this.formSchema.fields.forEach((field, index) => {
      field.displayOrder = index + 1;
    });
  }

  /**
   * Get next display order number
   */
  getNextDisplayOrder(): number {
    if (!this.formSchema || this.formSchema.fields.length === 0) return 1;
    return Math.max(...this.formSchema.fields.map(f => f.displayOrder)) + 1;
  }

  /**
   * Check if field name already exists
   */
  isFieldNameExists(fieldName: string, excludeIndex?: number): boolean {
    if (!this.formSchema) return false;
    return this.formSchema.fields.some((field, index) => 
      field.fieldName === fieldName && index !== excludeIndex
    );
  }

  /**
   * Save form schema
   */
  saveSchema(): void {
    if (!this.formSchema) return;

    // Validate schema
    if (this.formSchema.fields.length === 0) {
      this.snackBar.open('Please add at least one field to the form.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.saving = true;
    this.error = null;

    // Check if schema exists (has IDs) to decide between POST and PUT
    // Form schemas are now linked to Case Type
    const hasExistingFields = this.formSchema.fields.some(f => f.id);
    const caseTypeId = this.caseTypeId!;
    const saveMethod = hasExistingFields 
      ? this.adminService.updateFormSchema(caseTypeId, this.formSchema)
      : this.adminService.saveFormSchema(caseTypeId, this.formSchema);
    
    saveMethod
      .pipe(
        catchError(error => {
          this.saving = false;
          this.handleError(error);
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          this.saving = false;
          const apiResponse = response?.success !== undefined ? response : { success: true };
          if (apiResponse.success) {
            this.snackBar.open('Form schema saved successfully', 'Close', {
              duration: 3000,
              horizontalPosition: 'end',
              verticalPosition: 'top'
            });
            // Reload schema to get updated IDs
            this.loadFormSchema(this.caseTypeId!);
          }
        },
        error: () => {
          this.saving = false;
        }
      });
  }

  /**
   * Toggle preview mode
   */
  togglePreview(): void {
    if (!this.formSchema) {
      this.snackBar.open('Please wait for the form schema to load.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.showPreview = !this.showPreview;
    if (this.showPreview) {
      this.previewFormReady = false;
      // Use requestAnimationFrame to ensure it runs after current render
      requestAnimationFrame(() => {
        try {
          this.buildPreviewForm();
          // Use another RAF to ensure form is ready before showing
          requestAnimationFrame(() => {
            this.previewFormReady = true;
            this.cdr.detectChanges();
          });
        } catch (error) {
          console.error('Error building preview form:', error);
          this.snackBar.open('Failed to build preview. Please check console for details.', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.previewFormReady = true; // Set to true anyway so we don't stay in loading state
          this.cdr.detectChanges();
        }
      });
    } else {
      this.previewFormReady = false;
    }
    this.cdr.markForCheck();
  }

  /**
   * Build preview form
   */
  buildPreviewForm(): void {
    try {
      if (!this.formSchema || !this.formSchema.fields) {
        this.previewForm = this.fb.group({}, { emitEvent: false });
        return;
      }

      const formControls: { [key: string]: any } = {};

      // Get only active fields
      const activeFields = this.formSchema.fields.filter(field => field.isActive);
      
      if (activeFields.length === 0) {
        this.previewForm = this.fb.group({}, { emitEvent: false });
        return;
      }

    // Track field names to detect duplicates and map original to sanitized names
    const fieldNames = new Set<string>();

    // First pass: assign sanitized names to all active fields
    activeFields.forEach((field, index) => {
      // Validate field has required properties
      if (!field.fieldName || !field.fieldType) {
        console.warn(`Skipping field at index ${index} with missing fieldName or fieldType:`, field);
        return;
      }

      // Validate and sanitize field name (must be valid JavaScript identifier)
      // Only sanitize if the name is not already a valid identifier
      let sanitizedFieldName: string;
      
      if (this.isValidIdentifier(field.fieldName)) {
        // Name is already valid, use as-is unless it's a duplicate
        sanitizedFieldName = field.fieldName;
        
        // Check for duplicates
        if (fieldNames.has(sanitizedFieldName)) {
          let finalName = sanitizedFieldName;
          let counter = 0;
          while (fieldNames.has(finalName)) {
            counter++;
            finalName = `${sanitizedFieldName}_${counter}`;
          }
          sanitizedFieldName = finalName;
        }
      } else {
        // Name needs sanitization
        sanitizedFieldName = this.sanitizeFieldName(field.fieldName, fieldNames);
      }
      
      fieldNames.add(sanitizedFieldName);
      
      // Set sanitized name on the actual field object (activeFields items are references to formSchema.fields)
      field.__sanitizedFieldName = sanitizedFieldName;
    });
    
    // Invalidate cache so getSortedFields() will recalculate with sanitized names
    this.fieldsChanged = true;
    this.sortedFieldsCache = [];

    // Second pass: create form controls
    activeFields.forEach((field) => {
      if (!field.fieldName || !field.fieldType) {
        return;
      }
      
      const sanitizedFieldName = field.__sanitizedFieldName || field.fieldName;

      let initialValue: any = field.defaultValue || '';
      
      // Handle different field types
      if (field.fieldType === 'CHECKBOX') {
        initialValue = field.defaultValue === 'true';
      } else if (field.fieldType === 'NUMBER') {
        initialValue = field.defaultValue ? parseFloat(field.defaultValue) : null;
        if (isNaN(initialValue)) {
          initialValue = null;
        }
      } else if (field.fieldType === 'DATE') {
        // Keep date as string for now
        initialValue = field.defaultValue || null;
      } else if (field.fieldType === 'SELECT' || field.fieldType === 'RADIO') {
        // For SELECT/RADIO, validate options
        const options = this.getFieldOptions(field);
        if (options.length === 0 && field.fieldOptions) {
          console.warn(`Field ${field.fieldName} (${field.fieldLabel}) has ${field.fieldType} type but invalid options`);
        }
        // Default to empty string if no default value
        initialValue = field.defaultValue || '';
      }
      
      // Create form control with initial value using sanitized name
      formControls[sanitizedFieldName] = [initialValue];
    });

      // Create form group with emitEvent: false to prevent unnecessary change detection
      this.previewForm = this.fb.group(formControls, { emitEvent: false });
      console.log('Preview form built successfully with', Object.keys(formControls).length, 'fields');
      
    } catch (error: any) {
      console.error('Error building preview form:', error);
      console.error('Error details:', error.message || error);
      // Create empty form on error so we don't break the UI
      this.previewForm = this.fb.group({}, { emitEvent: false });
      throw error; // Re-throw so togglePreview can handle it
    }
  }

  /**
   * Check if a string is a valid JavaScript identifier
   */
  private isValidIdentifier(name: string): boolean {
    if (!name || typeof name !== 'string') return false;
    
    // JavaScript identifier rules:
    // - Must start with letter, underscore, or dollar sign
    // - Can contain letters, digits, underscore, or dollar sign
    // - Cannot be a reserved keyword (we'll allow common ones like 'name', 'type', etc.)
    const identifierRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    return identifierRegex.test(name.trim());
  }

  /**
   * Validate and sanitize field name to ensure it's a valid JavaScript identifier
   */
  private sanitizeFieldName(fieldName: string, existingNames: Set<string>): string {
    if (!fieldName || typeof fieldName !== 'string') {
      const generated = 'field_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      existingNames.add(generated);
      return generated;
    }
    
    let sanitized = fieldName.trim();
    
    // Replace spaces and special characters with underscores (keep underscores)
    sanitized = sanitized.replace(/[^a-zA-Z0-9_]/g, '_');
    
    // Remove multiple consecutive underscores
    sanitized = sanitized.replace(/_+/g, '_');
    
    // Remove leading/trailing underscores
    sanitized = sanitized.replace(/^_+|_+$/g, '');
    
    // Ensure it doesn't start with a number
    if (/^[0-9]/.test(sanitized)) {
      sanitized = 'field_' + sanitized;
    }
    
    // Ensure it's not empty after sanitization
    if (!sanitized || sanitized.length === 0) {
      sanitized = 'field_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    }
    
    // Check for duplicates and make unique if needed
    let finalName = sanitized;
    let counter = 0;
    while (existingNames.has(finalName)) {
      counter++;
      finalName = `${sanitized}_${counter}`;
    }
    
    existingNames.add(finalName);
    return finalName;
  }

  /**
   * Get sorted fields (cached for performance)
   */
  getSortedFields(): FormFieldDefinition[] {
    if (!this.formSchema || !this.formSchema.fields) {
      this.sortedFieldsCache = [];
      return [];
    }
    
    // Only recalculate if fields changed
    if (this.fieldsChanged || this.sortedFieldsCache.length !== this.formSchema.fields.length) {
      // Create a shallow copy and sort
      this.sortedFieldsCache = [...this.formSchema.fields].sort((a, b) => a.displayOrder - b.displayOrder);
      this.fieldsChanged = false;
    }
    
    return this.sortedFieldsCache;
  }

  /**
   * Get sorted fields count (optimized for template)
   */
  getSortedFieldsCount(): number {
    return this.getSortedFields().length;
  }

  /**
   * Get field index in formSchema.fields (for delete/update)
   */
  getFieldIndex(field: FormFieldDefinition): number {
    if (!this.formSchema?.fields || !field) return -1;
    if (field.id != null) {
      const i = this.formSchema.fields.findIndex(f => f.id === field.id);
      if (i !== -1) return i;
    }
    if (field.fieldName) {
      return this.formSchema.fields.findIndex(f => f.fieldName === field.fieldName);
    }
    return -1;
  }

  /**
   * Get field index in sorted order (for move up/down and disable state)
   */
  getSortedFieldIndex(field: FormFieldDefinition): number {
    if (!this.formSchema?.fields || !field) return -1;
    const sorted = this.getSortedFields();
    if (field.id != null) {
      const i = sorted.findIndex(f => f.id === field.id);
      if (i !== -1) return i;
    }
    if (field.fieldName) {
      return sorted.findIndex(f => f.fieldName === field.fieldName);
    }
    return -1;
  }

  /** Flat list for template: { type, groupLabel?, groupCode?, field?, schemaIndex, sortedIndex } */
  getFlatFieldsForList(): Array<{ type: 'group'; groupLabel: string; groupCode: string } | { type: 'field'; field: FormFieldDefinition; schemaIndex: number; sortedIndex: number }> {
    if (!this.formSchema?.fields?.length) return [];
    if (!this.fieldsChanged && this.flatFieldsListCache.length > 0) return this.flatFieldsListCache;
    const out: Array<{ type: 'group'; groupLabel: string; groupCode: string } | { type: 'field'; field: FormFieldDefinition; schemaIndex: number; sortedIndex: number }> = [];
    const groups = this.getGroupedFields();
    const sorted = this.getSortedFields();
    groups.forEach(g => {
      out.push({ type: 'group', groupLabel: g.groupLabel, groupCode: g.groupCode });
      g.fields.forEach(f => {
        const schemaIndex = this.getFieldIndex(f);
        const sortedIndex = sorted.findIndex(s => (s.id != null && s.id === f.id) || s.fieldName === f.fieldName);
        if (schemaIndex >= 0 && sortedIndex >= 0) {
          out.push({ type: 'field', field: f, schemaIndex, sortedIndex });
        }
      });
    });
    this.flatFieldsListCache = out;
    return out;
  }

  deleteFieldByIndex(schemaIndex: number): void {
    if (!this.formSchema?.fields || schemaIndex < 0 || schemaIndex >= this.formSchema.fields.length) {
      this.snackBar.open('Field not found', 'Close', { duration: 3000 });
      return;
    }
    const field = this.formSchema.fields[schemaIndex];
    const msg = `Delete "${field.fieldLabel}"? This cannot be undone.`;
    if (confirm(msg)) {
      this.deleteField(schemaIndex);
    }
  }

  editFieldByIndex(field: FormFieldDefinition): void {
    this.openFieldDialog(field);
  }

  moveFieldUpBySortedIndex(sortedIndex: number): void {
    if (sortedIndex <= 0) return;
    this.moveFieldUp(sortedIndex);
  }

  moveFieldDownBySortedIndex(sortedIndex: number): void {
    const n = this.getSortedFieldsCount();
    if (sortedIndex < 0 || sortedIndex >= n - 1) return;
    this.moveFieldDown(sortedIndex);
  }

  /**
   * Group fields by fieldGroup
   * Uses master field groups from API for group metadata (label, displayOrder)
   * Returns an array of groups, each containing fields sorted by displayOrder
   */
  getGroupedFields(): Array<{ groupCode: string; groupLabel: string; groupDisplayOrder: number; fields: FormFieldDefinition[] }> {
    if (!this.formSchema || !this.formSchema.fields) {
      return [];
    }

    const sortedFields = this.getSortedFields();
    const groupsMap = new Map<string, { groupCode: string; groupLabel: string; groupDisplayOrder: number; fields: FormFieldDefinition[] }>();

    sortedFields.forEach(field => {
      const groupCode = field.fieldGroup || 'default';
      
      // Find group metadata from master field groups
      const masterGroup = this.fieldGroups.find(g => g.groupCode === groupCode);
      const groupLabel = masterGroup?.groupLabel || groupCode || 'General';
      const groupDisplayOrder = masterGroup?.displayOrder || 999;

      if (!groupsMap.has(groupCode)) {
        groupsMap.set(groupCode, {
          groupCode,
          groupLabel,
          groupDisplayOrder,
          fields: []
        });
      }

      groupsMap.get(groupCode)!.fields.push(field);
    });

    // Convert map to array and sort by groupDisplayOrder
    return Array.from(groupsMap.values())
      .sort((a, b) => a.groupDisplayOrder - b.groupDisplayOrder);
  }

  /**
   * Check if a group has any active fields
   */
  hasActiveFieldsInGroup(group: { fields: FormFieldDefinition[] }): boolean {
    if (!group || !group.fields) return false;
    return group.fields.some(field => field.isActive);
  }

  /**
   * Load case type name from Case Types API
   * Uses Case Types API: GET /api/admin/case-types
   * Form schemas are now linked to Case Type (not Case Nature)
   */
  private loadCaseTypeNameFromList(): void {
    if (!this.caseTypeId) {
      this.createDefaultSchema();
      return;
    }
    
    // Get case type name from the list of all case types
    this.adminService.getAllCaseTypes()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.loading = false;
          console.error('Error loading case types list:', error);
          // If that also fails, use default
          this.createDefaultSchema();
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.error = null; // Clear any previous errors
          const apiResponse = response?.success !== undefined ? response : { success: true, data: response };
          if (apiResponse.success && apiResponse.data) {
            const caseTypes = Array.isArray(apiResponse.data) ? apiResponse.data : [];
            const caseType = caseTypes.find((ct: any) => ct.id === this.caseTypeId);
            
            if (caseType) {
              this.formSchema = {
                caseTypeId: this.caseTypeId!,
                caseTypeName: caseType.typeName || caseType.typeCode || `Case Type ${this.caseTypeId}`,
                caseTypeCode: caseType.typeCode || '',
                totalFields: 0,
                fields: []
              };
              this.caseTypeName = this.formSchema.caseTypeName;
            } else {
              // Case type not found in list, use default
              this.createDefaultSchema();
            }
          } else {
            this.createDefaultSchema();
          }
          this.showPreview = false;
          this.previewForm = this.fb.group({}, { emitEvent: false });
          this.sortedFieldsCache = [];
          this.fieldsChanged = true;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Create default schema when case type cannot be loaded
   */
  private createDefaultSchema(): void {
    this.formSchema = {
      caseTypeId: this.caseTypeId!,
      caseTypeName: `Case Type ${this.caseTypeId}`,
      caseTypeCode: '',
      totalFields: 0,
      fields: []
    };
    this.caseTypeName = `Case Type ${this.caseTypeId}`;
    this.showPreview = false;
    this.previewForm = this.fb.group({}, { emitEvent: false });
    this.sortedFieldsCache = [];
    this.fieldsChanged = true;
    this.cdr.markForCheck();
  }

  /**
   * Get active fields count
   */
  getActiveFieldsCount(): number {
    if (!this.formSchema || !this.formSchema.fields) return 0;
    return this.formSchema.fields.filter((f: FormFieldDefinition) => f.isActive).length;
  }

  /**
   * Check if there are active fields to preview
   */
  hasActiveFields(): boolean {
    if (!this.formSchema || !this.formSchema.fields) return false;
    return this.getActiveFieldsCount() > 0;
  }

  /**
   * Get field type label
   */
  getFieldTypeLabel(fieldType: string): string {
    const type = this.fieldTypes.find(t => t.value === fieldType);
    return type ? type.label : fieldType;
  }

  /**
   * Parse field options for display
   */
  getFieldOptionsDisplay(field: FormFieldDefinition): string {
    if (!field.fieldOptions) return '-';
    try {
      const options = JSON.parse(field.fieldOptions);
      if (Array.isArray(options)) {
        return options.map((opt: any) => opt.label || opt.value).join(', ');
      }
    } catch (e) {
      return field.fieldOptions;
    }
    return '-';
  }

  /**
   * Get field options as array (for preview)
   */
  getFieldOptions(field: FormFieldDefinition): any[] {
    if (!field || !field.fieldOptions) return [];
    
    // If it's already an array, return it
    if (Array.isArray(field.fieldOptions)) {
      return field.fieldOptions;
    }
    
    // If it's a string, try to parse it
    if (typeof field.fieldOptions === 'string') {
      try {
        const parsed = JSON.parse(field.fieldOptions);
        // Ensure it's an array
        if (Array.isArray(parsed)) {
          // Validate each option has value and label
          return parsed.map((opt: any, index: number) => {
            if (typeof opt === 'string') {
              return { value: opt, label: opt };
            } else if (typeof opt === 'object' && opt !== null) {
              return {
                value: opt.value !== undefined ? String(opt.value) : `option_${index}`,
                label: opt.label !== undefined ? String(opt.label) : String(opt.value || `Option ${index + 1}`)
              };
            }
            return { value: `option_${index}`, label: `Option ${index + 1}` };
          });
        }
      } catch (e) {
        console.warn(`Failed to parse fieldOptions for field ${field.fieldName}:`, e);
        return [];
      }
    }
    
    return [];
  }

  /**
   * Get icon for field type
   */
  getFieldIcon(fieldType: string): string {
    const iconMap: { [key: string]: string } = {
      'TEXT': 'text_fields',
      'NUMBER': 'numbers',
      'DATE': 'calendar_today',
      'EMAIL': 'email',
      'PHONE': 'phone',
      'TEXTAREA': 'notes',
      'SELECT': 'list',
      'RADIO': 'radio_button_checked',
      'CHECKBOX': 'check_box',
      'FILE': 'attach_file'
    };
    return iconMap[fieldType] || 'label';
  }

  /**
   * Handle errors
   */
  private handleError(error: any): void {
    if (error.error?.message) {
      this.error = error.error.message;
    } else if (error.status === 401) {
      this.error = 'Unauthorized. Please login again.';
    } else {
      this.error = error.message || 'An error occurred. Please try again.';
    }
    const errorMessage = this.error || 'An error occurred. Please try again.';
    this.snackBar.open(errorMessage, 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }

  /**
   * Cancel and go back
   */
  onCancel(): void {
    // Reset preview state before navigating
    this.showPreview = false;
    this.previewForm = this.fb.group({}, { emitEvent: false });
    this.sortedFieldsCache = [];
    this.fieldsChanged = true;
    this.router.navigate(['/admin/case-types']);
  }

  /**
   * Open dialog to create/edit field group
   */
  openFieldGroupDialog(group?: any): void {
    const dialogRef = this.dialog.open(FormFieldGroupDialogComponent, {
      width: '500px',
      data: {
        mode: group ? 'edit' : 'create',
        group: group,
        caseTypeId: this.caseTypeId,
        adminService: this.adminService
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.group) {
        // Reload field groups
        if (this.caseTypeId) {
          this.loadFieldGroups(this.caseTypeId);
        }
      }
    });
  }

  /**
   * Delete field group
   */
  deleteFieldGroup(group: any): void {
    const name = group?.groupLabel || group?.groupCode || 'this field group';
    if (!confirm(`Delete "${name}"? Fields using this group will have orphaned group codes.`)) return;
    
    this.loading = true;
    this.adminService.deleteFieldGroup(group.id)
      .pipe(
        catchError(err => {
          this.loading = false;
          this.snackBar.open(err.error?.message || 'Delete failed', 'Close', { duration: 3000 });
          return throwError(() => err);
        })
      )
      .subscribe({
        next: (res) => {
          this.loading = false;
          const r = res?.success !== undefined ? res : { success: true };
          if (r.success) {
            this.snackBar.open('Field group deleted', 'Close', { duration: 3000 });
            if (this.caseTypeId) {
              this.loadFieldGroups(this.caseTypeId);
            }
          }
        },
        error: () => { this.loading = false; }
      });
  }
}

/**
 * Dialog Component for Add/Edit Form Field
 */

@Component({
  selector: 'app-form-field-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.field ? 'Edit' : 'Add' }} Form Field</h2>
    <mat-dialog-content>
      <form [formGroup]="fieldForm" class="field-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Field Name *</mat-label>
          <input matInput formControlName="fieldName" placeholder="e.g., applicant_name">
          <mat-hint>Unique identifier (no spaces, use underscore)</mat-hint>
          <mat-error *ngIf="fieldForm.get('fieldName')?.hasError('required')">Field name is required</mat-error>
          <mat-error *ngIf="fieldForm.get('fieldName')?.hasError('pattern')">Only letters, numbers, and underscores allowed</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Field Label *</mat-label>
          <input matInput formControlName="fieldLabel" placeholder="e.g., Applicant Name">
          <mat-error *ngIf="fieldForm.get('fieldLabel')?.hasError('required')">Field label is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Field Type *</mat-label>
          <mat-select formControlName="fieldType">
            <mat-option *ngFor="let type of data.fieldTypes" [value]="type.value">
              {{ type.label }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="fieldForm.get('fieldType')?.hasError('required')">Field type is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" *ngIf="needsOptions()">
          <mat-label>Options (JSON Array)</mat-label>
          <textarea matInput formControlName="fieldOptions" rows="4" placeholder='Enter JSON array format'></textarea>
          <mat-hint>For SELECT/RADIO: [{{ '{' }}"value": "val1", "label": "Label 1"{{ '}' }}]</mat-hint>
          <mat-error *ngIf="fieldForm.get('fieldOptions')?.hasError('invalidJson')">Invalid JSON format</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Placeholder</mat-label>
          <input matInput formControlName="placeholder">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Help Text</mat-label>
          <textarea matInput formControlName="helpText" rows="2"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Default Value</mat-label>
          <input matInput formControlName="defaultValue">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Display Order</mat-label>
          <input type="number" matInput formControlName="displayOrder" min="1">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Field Group</mat-label>
          <mat-select formControlName="fieldGroup">
            <mat-option [value]="null">No Group</mat-option>
            <mat-option *ngFor="let group of fieldGroups" [value]="group.groupCode">
              {{ group.groupLabel }} ({{ group.groupCode }})
            </mat-option>
          </mat-select>
          <mat-hint>Select a group to organize this field (optional)</mat-hint>
          <button mat-icon-button matSuffix (click)="openCreateGroupDialog($event)" matTooltip="Create New Group" type="button">
            <mat-icon>add</mat-icon>
          </button>
        </mat-form-field>

        <div class="form-actions">
          <mat-checkbox formControlName="isRequired">Required Field</mat-checkbox>
          <mat-checkbox formControlName="isActive">Active</mat-checkbox>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="fieldForm.invalid">
        {{ data.field ? 'Update' : 'Add' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .field-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 20px 0;
      min-width: 600px;
    }
    .full-width {
      width: 100%;
    }
    .form-actions {
      display: flex;
      gap: 24px;
      margin-top: 8px;
    }
  `]
})
export class FormFieldDialogComponent {
  fieldForm: FormGroup;
  fieldGroups: any[] = [];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<FormFieldDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.fieldGroups = data.fieldGroups || [];
    const field = data.field || {};
    
    // Initialize form first
    this.fieldForm = this.fb.group({
      fieldName: [field.fieldName || '', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
      fieldLabel: [field.fieldLabel || '', Validators.required],
      fieldType: [field.fieldType || 'TEXT', Validators.required],
      fieldOptions: [field.fieldOptions || ''],
      placeholder: [field.placeholder || ''],
      helpText: [field.helpText || ''],
      defaultValue: [field.defaultValue || ''],
      displayOrder: [field.displayOrder || data.nextDisplayOrder || 1, [Validators.required, Validators.min(1)]],
      fieldGroup: [field.fieldGroup || null],
      // Note: groupLabel and groupDisplayOrder are now managed in master field groups table
      isRequired: [field.isRequired !== undefined ? field.isRequired : false],
      isActive: [field.isActive !== undefined ? field.isActive : true]
    });
    
    // If field groups are not provided or empty, try to load them
    if ((!this.fieldGroups || this.fieldGroups.length === 0) && data.caseTypeId && data.adminService) {
      this.loadFieldGroups(data.caseTypeId, data.adminService);
    } else if (this.fieldGroups && this.fieldGroups.length > 0) {
      // Field groups are available, ensure the fieldGroup value is set correctly
      const fieldGroupValue = field.fieldGroup || null;
      if (fieldGroupValue) {
        // Verify the group exists in the list
        const groupExists = this.fieldGroups.some(g => g.groupCode === fieldGroupValue);
        if (!groupExists) {
          console.warn('Field group', fieldGroupValue, 'not found in available groups');
        }
      }
    }

    // Validate JSON for options when field type is SELECT or RADIO
    this.fieldForm.get('fieldType')?.valueChanges.subscribe(() => {
      this.validateOptions();
    });
    this.fieldForm.get('fieldOptions')?.valueChanges.subscribe(() => {
      this.validateOptions();
    });
  }

  needsOptions(): boolean {
    const fieldType = this.fieldForm.get('fieldType')?.value;
    return fieldType === 'SELECT' || fieldType === 'RADIO';
  }

  /**
   * Load field groups if not provided
   */
  loadFieldGroups(caseTypeId: number, adminService: any): void {
    adminService.getFieldGroups(caseTypeId).subscribe({
      next: (response: any) => {
        const apiResponse = response?.success !== undefined ? response : { success: true, data: response };
        if (apiResponse.success) {
          this.fieldGroups = apiResponse.data || [];
          console.log('Field groups loaded in dialog:', this.fieldGroups.length);
          // Update the form's fieldGroup value if it exists but wasn't in the original list
          const currentFieldGroup = this.fieldForm.get('fieldGroup')?.value;
          if (currentFieldGroup && !this.fieldGroups.find(g => g.groupCode === currentFieldGroup)) {
            // Field group might have been deleted, keep the value but it won't show in dropdown
            console.warn('Field group', currentFieldGroup, 'not found in loaded groups');
          }
        }
      },
      error: (error: any) => {
        console.error('Error loading field groups in dialog:', error);
        this.snackBar.open('Failed to load field groups', 'Close', { duration: 3000 });
      }
    });
  }

  /**
   * Open dialog to create a new field group
   */
  openCreateGroupDialog(event: Event): void {
    event.stopPropagation(); // Prevent select from opening
    
    const createDialog = this.dialog.open(FormFieldGroupDialogComponent, {
      width: '500px',
      data: {
        mode: 'create',
        caseTypeId: this.data.caseTypeId,
        adminService: this.data.adminService
      }
    });

    createDialog.afterClosed().subscribe(result => {
      if (result && result.group) {
        // Reload field groups to get the latest list
        if (this.data.caseTypeId && this.data.adminService) {
          this.loadFieldGroups(this.data.caseTypeId, this.data.adminService);
          // Select the newly created group
          this.fieldForm.patchValue({ fieldGroup: result.group.groupCode });
          this.snackBar.open('Field group created successfully', 'Close', { duration: 3000 });
        } else {
          // Fallback: add to local list
          this.fieldGroups.push(result.group);
          this.fieldForm.patchValue({ fieldGroup: result.group.groupCode });
          this.snackBar.open('Field group created successfully', 'Close', { duration: 3000 });
        }
      }
    });
  }

  validateOptions(): void {
    const fieldType = this.fieldForm.get('fieldType')?.value;
    const options = this.fieldForm.get('fieldOptions')?.value;
    
    if ((fieldType === 'SELECT' || fieldType === 'RADIO') && options) {
      try {
        JSON.parse(options);
        this.fieldForm.get('fieldOptions')?.setErrors(null);
      } catch (e) {
        this.fieldForm.get('fieldOptions')?.setErrors({ invalidJson: true });
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.fieldForm.valid) {
      this.dialogRef.close(this.fieldForm.value);
    }
  }
}

/**
 * Dialog Component for Create/Edit Field Group
 */
@Component({
  selector: 'app-form-field-group-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Create' : 'Edit' }} Field Group</h2>
    <mat-dialog-content>
      <form [formGroup]="groupForm" class="group-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Group Code *</mat-label>
          <input matInput formControlName="groupCode" placeholder="e.g., deed_details" [readonly]="data.mode === 'edit'">
          <mat-hint>Unique identifier (no spaces, use underscore)</mat-hint>
          <mat-error *ngIf="groupForm.get('groupCode')?.hasError('required')">Group code is required</mat-error>
          <mat-error *ngIf="groupForm.get('groupCode')?.hasError('pattern')">Only letters, numbers, and underscores allowed</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Group Label *</mat-label>
          <input matInput formControlName="groupLabel" placeholder="e.g., Deed Details">
          <mat-error *ngIf="groupForm.get('groupLabel')?.hasError('required')">Group label is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Display Order</mat-label>
          <input type="number" matInput formControlName="displayOrder" min="1">
        </mat-form-field>

        <mat-checkbox formControlName="isActive">Active</mat-checkbox>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="groupForm.invalid || saving">
        <mat-spinner *ngIf="saving" diameter="20" class="btn-spin"></mat-spinner>
        <span *ngIf="!saving">{{ data.mode === 'create' ? 'Create' : 'Update' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .group-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 20px 0;
      min-width: 500px;
    }
    .full-width {
      width: 100%;
    }
    .btn-spin {
      display: inline-block;
      margin-right: 8px;
    }
  `]
})
export class FormFieldGroupDialogComponent {
  groupForm: FormGroup;
  saving = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<FormFieldGroupDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private snackBar: MatSnackBar
  ) {
    const group = data.group || {};
    this.groupForm = this.fb.group({
      groupCode: [group.groupCode || '', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
      groupLabel: [group.groupLabel || '', Validators.required],
      description: [group.description || ''],
      displayOrder: [group.displayOrder || 1, [Validators.required, Validators.min(1)]],
      isActive: [group.isActive !== undefined ? group.isActive : true]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.groupForm.invalid) return;
    this.saving = true;
    
    const payload = {
      caseTypeId: this.data.caseTypeId,
      ...this.groupForm.value
    };

    const adminService: AdminService = this.data.adminService;
    const req = this.data.mode === 'create'
      ? adminService.createFieldGroup(payload)
      : adminService.updateFieldGroup(this.data.group.id, payload);

    req.pipe(
      catchError(err => {
        this.saving = false;
        this.snackBar.open(err.error?.message || 'Save failed', 'Close', { duration: 3000 });
        return throwError(() => err);
      })
    ).subscribe({
      next: (res) => {
        this.saving = false;
        const r = res?.success !== undefined ? res : { success: true, data: res };
        if (r.success) {
          this.snackBar.open(`Field group ${this.data.mode === 'create' ? 'created' : 'updated'}`, 'Close', { duration: 3000 });
          this.dialogRef.close({ group: r.data || payload });
        }
      },
      error: () => { this.saving = false; }
    });
  }
}

