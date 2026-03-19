import { Component, OnInit } from '@angular/core';
import { ModuleFormsService, ModuleFormField, ModuleType, FieldType } from '../services/module-forms.service';
import { AdminService } from '../admin.service';

@Component({
  selector: 'app-module-forms',
  templateUrl: './module-forms.component.html',
  styleUrls: ['./module-forms.component.scss']
})
export class ModuleFormsComponent implements OnInit {
  // Data
  caseNatures: any[] = [];
  caseTypes: any[] = [];
  fields: ModuleFormField[] = [];

  // Selection
  selectedCaseNatureId: number | null = null;
  selectedCaseTypeId: number | null = null; // Optional: for case type override
  selectedModuleType: ModuleType = 'HEARING';

  // LocalStorage key for ASK_FIELD_REPORT fields
  private readonly STORAGE_KEY = 'ASK_FIELD_REPORT_FIELDS';

  // Module types for dropdown
  moduleTypes: ModuleType[] = ['HEARING', 'NOTICE', 'ORDERSHEET', 'JUDGEMENT', 'FIELD_REPORT', 'ASK_FIELD_REPORT'];

  // Field types for dropdown
  fieldTypes: FieldType[] = [
    'TEXT', 'TEXTAREA', 'RICH_TEXT', 'NUMBER', 'DATE', 'DATETIME',
    'SELECT', 'MULTISELECT', 'CHECKBOX', 'RADIO', 'FILE',
    'REPEATABLE_SECTION', 'DYNAMIC_FILES'
  ];

  // UI state
  loading = false;
  showFieldForm = false;
  editingField: ModuleFormField | null = null;

  // Field form
  fieldForm: Partial<ModuleFormField> = {
    fieldName: '',
    fieldLabel: '',
    fieldType: 'TEXT',
    isRequired: false,
    displayOrder: 1,
    defaultValue: '',
    placeholder: '',
    helpText: '',
    options: '',
    validationRules: '',
    itemSchema: '',
    conditionalLogic: '',
    requiredCondition: '',
    dataSource: '',
    dependsOnField: ''
  };

  constructor(
    private moduleFormsService: ModuleFormsService,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    this.loadCaseNatures();
  }

  /**
   * Load active case natures
   */
  loadCaseNatures(): void {
    this.loading = true;
    this.adminService.getAllCaseNatures().subscribe({
      next: (response: any) => {
        this.caseNatures = response.data || response;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading case natures:', error);
        alert('Failed to load case natures');
        this.loading = false;
      }
    });
  }

  /**
   * On case nature selection change
   */
  onCaseNatureChange(): void {
    this.selectedCaseTypeId = null; // Reset case type when nature changes
    this.caseTypes = [];
    if (this.selectedCaseNatureId) {
      this.loadCaseTypes();
      this.loadFields();
    }
  }

  /**
   * Load case types for selected case nature
   */
  loadCaseTypes(): void {
    if (!this.selectedCaseNatureId) return;

    this.adminService.getCaseTypesByCaseNature(this.selectedCaseNatureId).subscribe({
      next: (response: any) => {
        this.caseTypes = response.data || response;
      },
      error: (error) => {
        console.error('Error loading case types:', error);
      }
    });
  }

  /**
   * On case type selection change
   */
  onCaseTypeChange(): void {
    if (this.selectedCaseNatureId) {
      this.loadFields();
    }
  }

  /**
   * On module type change
   */
  onModuleTypeChange(): void {
    if (this.selectedCaseNatureId) {
      // If ASK_FIELD_REPORT is selected, store dummy data to localStorage
      if (this.selectedModuleType === 'ASK_FIELD_REPORT') {
        this.initializeASKFieldReportStorageIfNeeded();
      }
      this.loadFields();
    }
  }

  /**
   * Initialize localStorage for ASK_FIELD_REPORT fields if not already done
   */
  private initializeASKFieldReportStorageIfNeeded(): void {
    const existingData = localStorage.getItem(this.STORAGE_KEY);
    if (!existingData) {
      // First time, fetch dummy data from service and store it
      this.moduleFormsService.getFieldsByCaseNatureAndModule(
        this.selectedCaseNatureId!,
        'ASK_FIELD_REPORT',
        this.selectedCaseTypeId || undefined
      ).subscribe({
        next: (response) => {
          const fields = response.data || [];
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
            timestamp: new Date().toISOString(),
            fields: fields
          }));
        },
        error: (error) => {
          console.error('Error initializing ASK_FIELD_REPORT storage:', error);
        }
      });
    }
  }

  /**
   * Load fields for selected case nature and module type (with optional case type override)
   */
  loadFields(): void {
    if (!this.selectedCaseNatureId) return;

    this.loading = true;

    // For ASK_FIELD_REPORT, try to load from localStorage first
    if (this.selectedModuleType === 'ASK_FIELD_REPORT') {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          this.fields = parsed.fields || [];
          this.loading = false;
          return;
        } catch (error) {
          console.error('Error parsing localStorage data:', error);
        }
      }
    }

    this.moduleFormsService.getFieldsByCaseNatureAndModule(
      this.selectedCaseNatureId,
      this.selectedModuleType,
      this.selectedCaseTypeId || undefined
    ).subscribe({
      next: (response) => {
        this.fields = response.data || [];
        // Store to localStorage if it's ASK_FIELD_REPORT
        if (this.selectedModuleType === 'ASK_FIELD_REPORT') {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
            timestamp: new Date().toISOString(),
            fields: this.fields
          }));
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading fields:', error);
        alert('Failed to load fields');
        this.loading = false;
      }
    });
  }

  /**
   * Show add field form
   */
  addField(): void {
    this.editingField = null;
    this.fieldForm = {
      fieldName: '',
      fieldLabel: '',
      fieldType: 'TEXT',
      isRequired: false,
      displayOrder: this.fields.length + 1,
      defaultValue: '',
      placeholder: '',
      helpText: '',
      options: '',
      validationRules: '',
      itemSchema: '',
      conditionalLogic: '',
      requiredCondition: '',
      dataSource: '',
      dependsOnField: ''
    };
    this.showFieldForm = true;
  }

  /**
   * Edit existing field
   */
  editField(field: ModuleFormField): void {
    this.editingField = field;
    this.fieldForm = { ...field };
    this.showFieldForm = true;
  }

  /**
   * Save field (create or update)
   */
  saveField(): void {
    if (!this.selectedCaseNatureId) {
      alert('Please select a case nature');
      return;
    }

    if (!this.fieldForm.fieldName || !this.fieldForm.fieldLabel) {
      alert('Field name and label are required');
      return;
    }

    const fieldData: ModuleFormField = {
      ...this.fieldForm,
      caseNatureId: this.selectedCaseNatureId,
      caseTypeId: this.selectedCaseTypeId || undefined, // Include case type override if selected
      moduleType: this.selectedModuleType
    } as ModuleFormField;

    this.loading = true;

    // For ASK_FIELD_REPORT, handle localStorage
    if (this.selectedModuleType === 'ASK_FIELD_REPORT') {
      this.saveFieldToLocalStorage(fieldData);
      return;
    }

    if (this.editingField && this.editingField.id) {
      // Update existing field
      this.moduleFormsService.updateField(this.editingField.id, fieldData).subscribe({
        next: () => {
          alert('Field updated successfully');
          this.showFieldForm = false;
          this.loadFields();
        },
        error: (error) => {
          console.error('Error updating field:', error);
          alert('Failed to update field');
          this.loading = false;
        }
      });
    } else {
      // Create new field
      this.moduleFormsService.createField(fieldData).subscribe({
        next: () => {
          alert('Field created successfully');
          this.showFieldForm = false;
          this.loadFields();
        },
        error: (error) => {
          console.error('Error creating field:', error);
          alert('Failed to create field');
          this.loading = false;
        }
      });
    }
  }

  /**
   * Save field to localStorage for ASK_FIELD_REPORT
   */
  private saveFieldToLocalStorage(fieldData: ModuleFormField): void {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      let storageObj: any = { timestamp: new Date().toISOString(), fields: [] };

      if (storedData) {
        storageObj = JSON.parse(storedData);
      }

      if (this.editingField && this.editingField.id) {
        // Update existing field in localStorage
        const fieldIndex = storageObj.fields.findIndex((f: ModuleFormField) => f.id === this.editingField!.id);
        if (fieldIndex !== -1) {
          storageObj.fields[fieldIndex] = fieldData;
        }
      } else {
        // Generate a temporary ID for new field
        const maxId = storageObj.fields.length > 0
          ? Math.max(...storageObj.fields.map((f: ModuleFormField) => f.id || 0))
          : 0;
        fieldData.id = maxId + 1;
        fieldData.createdAt = new Date().toISOString();
        fieldData.updatedAt = new Date().toISOString();
        storageObj.fields.push(fieldData);
      }

      storageObj.timestamp = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storageObj));

      alert('Field saved successfully');
      this.showFieldForm = false;
      this.loading = false;
      this.loadFields();
    } catch (error) {
      console.error('Error saving field to localStorage:', error);
      alert('Failed to save field');
      this.loading = false;
    }
  }

  /**
   * Delete field
   */
  deleteField(field: ModuleFormField): void {
    if (!field.id) return;

    if (!confirm(`Are you sure you want to delete field "${field.fieldLabel}"?`)) {
      return;
    }

    this.loading = true;

    // For ASK_FIELD_REPORT, handle localStorage deletion
    if (this.selectedModuleType === 'ASK_FIELD_REPORT') {
      this.deleteFieldFromLocalStorage(field.id);
      return;
    }

    this.moduleFormsService.deleteField(field.id).subscribe({
      next: () => {
        alert('Field deleted successfully');
        this.loadFields();
      },
      error: (error) => {
        console.error('Error deleting field:', error);
        alert('Failed to delete field');
        this.loading = false;
      }
    });
  }

  /**
   * Delete field from localStorage for ASK_FIELD_REPORT
   */
  private deleteFieldFromLocalStorage(fieldId: number): void {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (storedData) {
        const storageObj = JSON.parse(storedData);
        storageObj.fields = storageObj.fields.filter((f: ModuleFormField) => f.id !== fieldId);
        storageObj.timestamp = new Date().toISOString();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storageObj));
      }
      alert('Field deleted successfully');
      this.loading = false;
      this.loadFields();
    } catch (error) {
      console.error('Error deleting field from localStorage:', error);
      alert('Failed to delete field');
      this.loading = false;
    }
  }

  /**
   * Cancel field form
   */
  cancelFieldForm(): void {
    this.showFieldForm = false;
    this.editingField = null;
  }

  /**
   * Move field up
   */
  moveFieldUp(index: number): void {
    if (index === 0) return;

    const field = this.fields[index];
    const prevField = this.fields[index - 1];

    // Swap display orders
    const tempOrder = field.displayOrder;
    field.displayOrder = prevField.displayOrder;
    prevField.displayOrder = tempOrder;

    // Update both fields
    this.updateFieldOrder(field, prevField);
  }

  /**
   * Move field down
   */
  moveFieldDown(index: number): void {
    if (index === this.fields.length - 1) return;

    const field = this.fields[index];
    const nextField = this.fields[index + 1];

    // Swap display orders
    const tempOrder = field.displayOrder;
    field.displayOrder = nextField.displayOrder;
    nextField.displayOrder = tempOrder;

    // Update both fields
    this.updateFieldOrder(field, nextField);
  }

  /**
   * Update field order in backend
   */
  private updateFieldOrder(field1: ModuleFormField, field2: ModuleFormField): void {
    if (!this.selectedCaseNatureId || !field1.id || !field2.id) return;

    // For ASK_FIELD_REPORT, handle localStorage
    if (this.selectedModuleType === 'ASK_FIELD_REPORT') {
      this.updateFieldOrderInLocalStorage(field1, field2);
      return;
    }

    const fieldOrders = [
      { fieldId: field1.id, displayOrder: field1.displayOrder },
      { fieldId: field2.id, displayOrder: field2.displayOrder }
    ];

    this.moduleFormsService.reorderFields(
      this.selectedCaseNatureId,
      this.selectedModuleType,
      fieldOrders
    ).subscribe({
      next: () => {
        this.loadFields();
      },
      error: (error) => {
        console.error('Error reordering fields:', error);
        alert('Failed to reorder fields');
      }
    });
  }

  /**
   * Update field order in localStorage for ASK_FIELD_REPORT
   */
  private updateFieldOrderInLocalStorage(field1: ModuleFormField, field2: ModuleFormField): void {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (storedData) {
        const storageObj = JSON.parse(storedData);
        storageObj.timestamp = new Date().toISOString();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storageObj));
        this.loadFields();
      }
    } catch (error) {
      console.error('Error updating field order in localStorage:', error);
      alert('Failed to reorder fields');
    }
  }

  /**
   * Get field type label
   */
  getFieldTypeLabel(fieldType: FieldType): string {
    const labels: Record<string, string> = {
      'TEXT': 'Text',
      'TEXTAREA': 'Text Area',
      'RICH_TEXT': 'Rich Text Editor (WYSIWYG)',
      'NUMBER': 'Number',
      'DATE': 'Date',
      'DATETIME': 'Date & Time',
      'SELECT': 'Select (Dropdown)',
      'MULTISELECT': 'Multi-Select',
      'CHECKBOX': 'Checkbox',
      'RADIO': 'Radio Button',
      'FILE': 'File Upload',
      'REPEATABLE_SECTION': 'Repeatable Section (e.g. Attendance / Party list)',
      'DYNAMIC_FILES': 'Dynamic Files (multiple uploads)'
    };
    return labels[fieldType] || fieldType;
  }

  /**
   * Check if field type needs options
   */
  needsOptions(fieldType: FieldType): boolean {
    return ['SELECT', 'MULTISELECT', 'RADIO', 'CHECKBOX'].includes(fieldType);
  }

  /**
   * Check if field type uses item schema (repeatable section)
   */
  needsItemSchema(fieldType: FieldType): boolean {
    return fieldType === 'REPEATABLE_SECTION';
  }
}
