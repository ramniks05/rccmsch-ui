import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OfficerGuard } from '../core/guards/officer.guard';
import { OfficerResetPasswordComponent } from './officer-reset-password/officer-reset-password.component';
import { OfficerHomeComponent } from './officer-home/officer-home.component';
import { OfficerMyCasesComponent } from './officer-my-cases/officer-my-cases.component';
import { OfficerCaseDetailComponent } from './officer-case-detail/officer-case-detail.component';
import { WorkflowActionDialogComponent } from './workflow-action-dialog/workflow-action-dialog.component';
import { HearingFormComponent } from './hearing-form/hearing-form.component';
import { DocumentEditorComponent } from './document-editor/document-editor.component';
import { FieldReportRequestDialogComponent } from './field-report-request-dialog/field-report-request-dialog.component';
import { FieldReportFormComponent } from './field-report-form/field-report-form.component';
import { FieldReportViewComponent } from './field-report-view/field-report-view.component';
import { AttendanceFormComponent } from './attendance-form/attendance-form.component';
import { DocumentsActionDialogComponent } from './documents-action-dialog/documents-action-dialog.component';
import { FormsActionDialogComponent } from './forms-action-dialog/forms-action-dialog.component';
import { AskFieldReportFormComponent } from './ask-field-report-form/ask-field-report-form.component';
import { SharedModule } from '../shared/shared.module';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    component: OfficerHomeComponent,
    canActivate: [OfficerGuard],
    data: { breadcrumb: 'Home' }
  },
  {
    path: 'cases',
    component: OfficerMyCasesComponent,
    canActivate: [OfficerGuard],
    data: { breadcrumb: 'My Cases' }
  },
  {
    path: 'cases/:id',
    component: OfficerCaseDetailComponent,
    canActivate: [OfficerGuard],
    data: { breadcrumb: 'Case Details' }
  },
  {
    path: 'reset-password',
    component: OfficerResetPasswordComponent,
    data: { breadcrumb: 'Reset Password' }
  }
];

@NgModule({
  declarations: [
    OfficerResetPasswordComponent,
    OfficerHomeComponent,
    OfficerMyCasesComponent,
    OfficerCaseDetailComponent,
    WorkflowActionDialogComponent,
    HearingFormComponent,
    DocumentEditorComponent,
    FieldReportRequestDialogComponent,
    FieldReportFormComponent,
    FieldReportViewComponent,
    AttendanceFormComponent,
    DocumentsActionDialogComponent,
    FormsActionDialogComponent,
    AskFieldReportFormComponent
  ],
  imports: [
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class OfficerModule { }


