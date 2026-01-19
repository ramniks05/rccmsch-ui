import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

// Guards
import { AdminGuard } from '../core/guards/admin.guard';

// Components
import { AdminLoginComponent } from './admin-login/admin-login.component';
import { AdminHomeComponent } from './admin-home/admin-home.component';
import { AdministrativeUnitsComponent, AdminUnitDialogComponent } from './administrative-units/administrative-units.component';
import { OfficersComponent, OfficerDialogComponent } from './officers/officers.component';
import { PostingsComponent, PostingDialogComponent } from './postings/postings.component';
import { CaseTypesComponent, CaseTypeDialogComponent } from './case-types/case-types.component';
import { FormSchemaBuilderComponent, FormFieldDialogComponent } from './form-schema-builder/form-schema-builder.component';
import { SystemSettingsComponent } from './system-settings/system-settings.component';

/**
 * Routes for Admin Module
 */
const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: AdminLoginComponent
  },
  {
    path: 'home',
    component: AdminHomeComponent,
    canActivate: [AdminGuard]
  },
  {
    path: 'administrative-units',
    component: AdministrativeUnitsComponent,
    canActivate: [AdminGuard]
  },
  {
    path: 'officers',
    component: OfficersComponent,
    canActivate: [AdminGuard]
  },
  {
    path: 'postings',
    component: PostingsComponent,
    canActivate: [AdminGuard]
  },
  {
    path: 'case-types',
    component: CaseTypesComponent,
    canActivate: [AdminGuard]
  },
  {
    path: 'form-schema-builder/:caseTypeId',
    component: FormSchemaBuilderComponent,
    canActivate: [AdminGuard]
  },
  {
    path: 'system-settings',
    component: SystemSettingsComponent,
    canActivate: [AdminGuard]
  }
];

/**
 * Admin Module
 * Handles all admin-related pages and features
 */
@NgModule({
  declarations: [
    AdminLoginComponent,
    AdminHomeComponent,
    AdministrativeUnitsComponent,
    AdminUnitDialogComponent,
    OfficersComponent,
    OfficerDialogComponent,
    PostingsComponent,
    PostingDialogComponent,
    CaseTypesComponent,
    CaseTypeDialogComponent,
    FormSchemaBuilderComponent,
    FormFieldDialogComponent,
    SystemSettingsComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule.forChild(routes),
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatRadioModule,
    MatDatepickerModule,
    MatNativeDateModule
  ]
})
export class AdminModule { }

