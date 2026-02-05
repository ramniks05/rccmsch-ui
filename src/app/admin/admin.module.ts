import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
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
import { CalendarComponent } from './calendar/calendar.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { SharedModule } from '../shared/shared.module';
import { AdminLayoutComponent } from './admin-layout/admin-layout.component';
import { WhatsNewComponent } from './whats-new/whats-new.component';

/**
 * Routes for Admin Module
 */
const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  // LOGIN (NO SIDEBAR)
  {
    path: 'login',
    component: AdminLoginComponent,
    data: { breadcrumb: 'Login' }
  },

  // ADMIN LAYOUT (WITH SIDEBAR)
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [AdminGuard],
    children: [
      {
        path: 'home',
        component: DashboardComponent,
        data: { breadcrumb: 'Dashboard' }
      },
      {
        path: 'features',
        component: AdminHomeComponent,
        data: { breadcrumb: 'Features' }
      },
      {
        path: 'administrative-units',
        component: AdministrativeUnitsComponent,
        data: { breadcrumb: 'Administrative Units' }
      },
      {
        path: 'officers',
        component: OfficersComponent,
        data: { breadcrumb: 'Officers' }
      },
      {
        path: 'postings',
        component: PostingsComponent,
        data: { breadcrumb: 'Postings' }
      },
      {
        path: 'case-types',
        component: CaseTypesComponent,
        data: { breadcrumb: 'Case Types' }
      },
      {
        path: 'acts',
        component: ActsComponent,
        data: { breadcrumb: 'Acts' }
      },
      {
        path: 'case-natures',
        component: CaseNaturesComponent,
        data: { breadcrumb: 'Case Natures' }
      },
      {
        path: 'courts',
        component: CourtsComponent,
        data: { breadcrumb: 'Courts' }
      },
      {
        path: 'form-schema-builder/:caseTypeId',
        component: FormSchemaBuilderComponent,
        data: { breadcrumb: 'Form Schema Builder' }
      },
      {
        path: 'system-settings',
        component: SystemSettingsComponent,
        data: { breadcrumb: 'System Settings' }
      },
      {
        path: 'workflows',
        component: WorkflowListComponent,
        data: { breadcrumb: 'Workflows' }
      },
      {
        path: 'workflows/:id',
        component: WorkflowBuilderComponent,
        data: { breadcrumb: 'Workflow Builder' }
      },
      {
        path: 'registration-forms',
        component: RegistrationFormsComponent,
        data: { breadcrumb: 'Registration Forms' }
      },
      {
        path: 'module-forms',
        component: ModuleFormsComponent,
        data: { breadcrumb: 'Module Forms Configuration' }
      },
      {
        path: 'document-templates',
        component: DocumentTemplatesComponent,
        data: { breadcrumb: 'Document Templates' }
      },
      {
        path: 'calendar',
        component: CalendarComponent,
        data: { breadcrumb: 'Calendar' }
      },

      // default after login
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
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
    DocumentTemplatesComponent,
    CalendarComponent,
    DashboardComponent,
    AdminLayoutComponent,
    WhatsNewComponent
  ],
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
  ]
})
export class AdminModule { }

