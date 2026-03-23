import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OfficerGuard } from '../core/guards/officer.guard';
import { OfficerResetPasswordComponent } from './officer-reset-password/officer-reset-password.component';
import { OfficerHomeComponent } from './officer-home/officer-home.component';
import { OfficerMyCasesComponent } from './officer-my-cases/officer-my-cases.component';
import { OfficerCaseDetailComponent } from './officer-case-detail/officer-case-detail.component';
import { WorkflowActionDialogComponent } from './workflow-action-dialog/workflow-action-dialog.component';
import { ModuleFormComponent } from './module-form/module-form.component';
import { DocumentEditorComponent } from './document-editor/document-editor.component';
import { DocumentsActionDialogComponent } from './documents-action-dialog/documents-action-dialog.component';
import { FormsActionDialogComponent } from './forms-action-dialog/forms-action-dialog.component';
import { HearingShiftComponent } from './hearing-shift/hearing-shift.component';
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
    path: 'hearing-shift',
    component: HearingShiftComponent,
    canActivate: [OfficerGuard],
    data: { breadcrumb: 'Hearing Shift' }
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
    ModuleFormComponent,
    DocumentEditorComponent,
    DocumentsActionDialogComponent,
    FormsActionDialogComponent,
    HearingShiftComponent
  ],
  imports: [
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class OfficerModule { }


