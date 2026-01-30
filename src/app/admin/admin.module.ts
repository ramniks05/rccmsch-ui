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
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';

// Guards
import { AdminGuard } from '../core/guards/admin.guard';

// Components
import { AdminLoginComponent } from './admin-login/admin-login.component';
import { AdminHomeComponent } from './admin-home/admin-home.component';
import { AdministrativeUnitsComponent, AdminUnitDialogComponent } from './administrative-units/administrative-units.component';
import { OfficersComponent, OfficerDialogComponent } from './officers/officers.component';
import { PostingsComponent, PostingDialogComponent } from './postings/postings.component';
import { CaseTypesComponent, CaseTypeDialogComponent } from './case-types/case-types.component';
import { ActsComponent, ActDialogComponent } from './acts/acts.component';
import { CaseNaturesComponent, CaseNatureDialogComponent } from './case-natures/case-natures.component';
import { CourtsComponent, CourtDialogComponent } from './courts/courts.component';
import { FormSchemaBuilderComponent, FormFieldDialogComponent, FormFieldGroupDialogComponent } from './form-schema-builder/form-schema-builder.component';
import { SystemSettingsComponent } from './system-settings/system-settings.component';
import { WorkflowListComponent } from './workflows/workflow-list/workflow-list.component';
import { WorkflowBuilderComponent } from './workflows/workflow-builder/workflow-builder.component';
import { WorkflowDialogComponent } from './workflows/workflow-dialog/workflow-dialog.component';
import { WorkflowStatesComponent } from './workflows/workflow-states/workflow-states.component';
import { WorkflowStateDialogComponent } from './workflows/workflow-state-dialog/workflow-state-dialog.component';
import { WorkflowTransitionsComponent } from './workflows/workflow-transitions/workflow-transitions.component';
import { WorkflowTransitionDialogComponent } from './workflows/workflow-transition-dialog/workflow-transition-dialog.component';
import { WorkflowPermissionsComponent } from './workflows/workflow-permissions/workflow-permissions.component';
import { WorkflowPermissionDialogComponent } from './workflows/workflow-permission-dialog/workflow-permission-dialog.component';
import { WorkflowConditionEditorComponent } from './workflows/workflow-condition-editor/workflow-condition-editor.component';
import { ViewTransitionConditionsDialogComponent } from './workflows/view-transition-conditions-dialog/view-transition-conditions-dialog.component';
import { RegistrationFormsComponent } from './registration-forms/registration-forms.component';
import { RegistrationFormFieldDialogComponent } from './registration-forms/registration-form-field-dialog/registration-form-field-dialog.component';
import { RegistrationFormGroupsComponent } from './registration-forms/registration-form-groups/registration-form-groups.component';
import { RegistrationFormGroupDialogComponent } from './registration-forms/registration-form-groups/registration-form-group-dialog/registration-form-group-dialog.component';
import { ModuleFormsComponent } from './module-forms/module-forms.component';
import { DocumentTemplatesComponent } from './document-templates/document-templates.component';

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
    component: AdminLoginComponent,
    data: { breadcrumb: 'Login' }
  },
  {
    path: 'home',
    component: AdminHomeComponent,
    canActivate: [AdminGuard],
    data: { breadcrumb: 'Home' }
  },
  {
    path: 'administrative-units',
    component: AdministrativeUnitsComponent,
    canActivate: [AdminGuard],
    data: { breadcrumb: 'Administrative Units' }
  },
  {
    path: 'officers',
    component: OfficersComponent,
    canActivate: [AdminGuard],
    data: { breadcrumb: 'Officers' }
  },
  {
    path: 'postings',
    component: PostingsComponent,
    canActivate: [AdminGuard],
    data: { breadcrumb: 'Postings' }
  },
  {
    path: 'case-types',
    component: CaseTypesComponent,
    canActivate: [AdminGuard],
    data: { breadcrumb: 'Case Types' }
  },
  {
    path: 'acts',
    component: ActsComponent,
    canActivate: [AdminGuard],
    data: { breadcrumb: 'Acts' }
  },
  {
    path: 'case-natures',
    component: CaseNaturesComponent,
    canActivate: [AdminGuard],
    data: { breadcrumb: 'Case Natures' }
  },
  {
    path: 'courts',
    component: CourtsComponent,
    canActivate: [AdminGuard],
    data: { breadcrumb: 'Courts' }
  },
  {
    path: 'form-schema-builder/:caseTypeId',
    component: FormSchemaBuilderComponent,
    canActivate: [AdminGuard],
    data: { breadcrumb: 'Form Schema Builder' }
  },
  {
    path: 'system-settings',
    component: SystemSettingsComponent,
    canActivate: [AdminGuard],
    data: { breadcrumb: 'System Settings' }
  },
  {
    path: 'workflows',
    component: WorkflowListComponent,
    canActivate: [AdminGuard],
    data: { breadcrumb: 'Workflows' }
  },
  {
    path: 'workflows/:id',
    component: WorkflowBuilderComponent,
    canActivate: [AdminGuard],
    data: { breadcrumb: 'Workflow Builder' }
  },
  {
    path: 'registration-forms',
    component: RegistrationFormsComponent,
    canActivate: [AdminGuard],
    data: { breadcrumb: 'Registration Forms' }
  },
  {
    path: 'module-forms',
    component: ModuleFormsComponent,
    canActivate: [AdminGuard],
    data: { breadcrumb: 'Module Forms Configuration' }
  },
  {
    path: 'document-templates',
    component: DocumentTemplatesComponent,
    canActivate: [AdminGuard],
    data: { breadcrumb: 'Document Templates' }
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
    ActsComponent,
    ActDialogComponent,
    CaseNaturesComponent,
    CaseNatureDialogComponent,
    CourtsComponent,
    CourtDialogComponent,
    FormSchemaBuilderComponent,
    FormFieldDialogComponent,
    FormFieldGroupDialogComponent,
    SystemSettingsComponent,
    WorkflowListComponent,
    WorkflowBuilderComponent,
    WorkflowDialogComponent,
    WorkflowStatesComponent,
    WorkflowStateDialogComponent,
    WorkflowTransitionsComponent,
    WorkflowTransitionDialogComponent,
    WorkflowPermissionsComponent,
    WorkflowPermissionDialogComponent,
    WorkflowConditionEditorComponent,
    ViewTransitionConditionsDialogComponent,
    RegistrationFormsComponent,
    RegistrationFormFieldDialogComponent,
    RegistrationFormGroupsComponent,
    RegistrationFormGroupDialogComponent,
    ModuleFormsComponent,
    DocumentTemplatesComponent
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
    MatNativeDateModule,
    MatTabsModule,
    MatExpansionModule
  ]
})
export class AdminModule { }

