import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';

import { OfficerGuard } from '../core/guards/officer.guard';
import { OfficerResetPasswordComponent } from './officer-reset-password/officer-reset-password.component';
import { OfficerHomeComponent } from './officer-home/officer-home.component';
import { OfficerMyCasesComponent } from './officer-my-cases/officer-my-cases.component';
import { OfficerCaseDetailComponent } from './officer-case-detail/officer-case-detail.component';
import { WorkflowActionDialogComponent } from './workflow-action-dialog/workflow-action-dialog.component';
import { HearingFormComponent } from './hearing-form/hearing-form.component';
import { DocumentEditorComponent } from './document-editor/document-editor.component';

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
    DocumentEditorComponent
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
    MatSelectModule,
    MatSnackBarModule,
    MatDialogModule,
    MatChipsModule,
    MatTabsModule
  ]
})
export class OfficerModule { }


