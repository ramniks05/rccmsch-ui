import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FormSchemaService } from 'src/app/core/services/form-schema.service';

@Component({
  selector: 'app-dynamic-case-form',
  templateUrl: './dynamic-case-form.component.html',
  styleUrls: ['./dynamic-case-form.component.scss'],
})
export class DynamicCaseFormComponent implements OnInit {
  form!: FormGroup;
  fields: any[] = [];
  caseTypeName = '';
  icon = 'description'; // default icon

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private schemaService: FormSchemaService,
  ) {}

  ngOnInit(): void {
    const caseTypeId = Number(this.route.snapshot.paramMap.get('caseTypeId'));

    // icon from route param
    const routeIcon = this.route.snapshot.paramMap.get('icon');
    if (routeIcon) {
      this.icon = routeIcon;
    }

    if (caseTypeId) {
      this.loadSchema(caseTypeId);
    }
  }

  loadSchema(caseTypeId: number): void {
    this.schemaService.getFormSchema(caseTypeId).subscribe({
      next: (res) => {
        const data = res.data;

        this.caseTypeName = data.caseTypeName;

        this.fields = data.fields
          .filter((f: any) => f.isActive)
          .sort((a: any, b: any) => a.displayOrder - b.displayOrder);

        this.buildForm();
      },
      error: (err) => {
        console.error('Error loading form schema', err);
      },
    });
  }

  buildForm(): void {
    const group: any = {};

    this.fields.forEach((field) => {
      const validators = [];

      if (field.isRequired) {
        validators.push(Validators.required);
      }

      if (field.validationRules) {
        try {
          const rules = JSON.parse(field.validationRules);

          if (rules.minLength) {
            validators.push(Validators.minLength(rules.minLength));
          }
          if (rules.maxLength) {
            validators.push(Validators.maxLength(rules.maxLength));
          }
          if (rules.pattern) {
            validators.push(Validators.pattern(rules.pattern));
          }
        } catch (e) {
          console.warn('Invalid validationRules JSON', field.validationRules);
        }
      }

      group[field.fieldName] = [field.defaultValue ?? null, validators];
    });

    this.form = this.fb.group(group);
  }

  onFileChange(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      this.form.get(fieldName)?.setValue(input.files[0]);
    }
  }

  submit(): void {
    if (!this.form || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formData = new FormData();

    Object.entries(this.form.value).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value as any);
      }
    });

    console.log('Submitting FormData:');
    formData.forEach((value, key) => {
      console.log(key, value);
    });
  }
}
