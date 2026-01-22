import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormControl,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-dynamic-stepper-form',
  templateUrl: './dynamic-stepper-form.component.html',
  styleUrls: ['./dynamic-stepper-form.component.scss'],
})
export class DynamicStepperFormComponent implements OnInit {
  categories: any[] = [];
  form!: FormGroup;
  icon = 'description';
  caseTypeName = '';
  fileInputs: { [key: string]: HTMLInputElement } = {};

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const caseTypeId = Number(this.route.snapshot.paramMap.get('caseTypeId'));

    // icon from route param
    const routeIcon = this.route.snapshot.paramMap.get('icon');
    if (routeIcon) {
      this.icon = routeIcon;
    }
    const routeName = this.route.snapshot.paramMap.get('title');
    if (routeName) {
      this.caseTypeName = routeName;
    }
    this.loadMockData();
  }

  ngAfterViewInit() {
    this.categories.forEach((category) => {
      category.fields.forEach((field: any) => {
        if (field.fieldType === 'FILE') {
          const input = document.querySelector<HTMLInputElement>(`#fileInput`);
          if (input) this.fileInputs[field.fieldName] = input;
        }
      });
    });
  }

  loadMockData() {
    this.http.get<any>('assets/mock-data.json').subscribe({
      next: (response) => {
        console.log(response);

        this.categories = response.data.categories;
        this.buildForm();
      },
      error: (err) => {
        console.error('Failed to load mock data', err);
      },
    });
  }

  buildForm() {
    const group: any = {};

    this.categories.forEach((category) => {
      category.fields.forEach((field: any) => {
        const validators = [];

        if (field.isRequired) {
          validators.push(Validators.required);
        }

        group[field.fieldName] = new FormControl(
          field.defaultValue || '',
          validators,
        );
      });
    });

    this.form = this.fb.group(group);
  }

  onFileChange(event: any, fieldName: string) {
    const file = event.target.files[0];
    this.form.get(fieldName)?.setValue(file);
  }

  submit() {
    console.log('Final Form Value:', this.form.value);
  }
}
