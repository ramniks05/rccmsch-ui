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
  
  // Module types for dropdown
  moduleTypes: ModuleType[] = ['HEARING', 'NOTICE', 'ORDERSHEET', 'JUDGEMENT'];
  
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
      this.loadFields();
    }
  }

  /**
   * Load fields for selected case nature and module type (with optional case type override)
   */
  loadFields(): void {
    if (!this.selectedCaseNatureId) return;
    
    this.loading = true;
    this.moduleFormsService.getFieldsByCaseNatureAndModule(
      this.selectedCaseNatureId, 
      this.selectedModuleType,
      this.selectedCaseTypeId || undefined
    ).subscribe({
      next: (response) => {
        this.fields = response.data || [];
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
   * Delete field
   */
  deleteField(field: ModuleFormField): void {
    if (!field.id) return;
    
    if (!confirm(`Are you sure you want to delete field "${field.fieldLabel}"?`)) {
      return;
    }

    this.loading = true;
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
