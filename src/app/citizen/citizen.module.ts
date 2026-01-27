import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

// Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Components
import { CitizenHomeComponent } from './citizen-home/citizen-home.component';
import { LandProcessTypesComponent } from './land-process-types/land-process-types.component';
import { SharedModule } from '../shared/shared.module';
import { ServicesLayoutComponent } from './services-layout/services-layout.component';
import { DynamicCaseFormComponent } from './dynamic-case-form/dynamic-case-form.component';
import { MyProfileComponent } from './my-profile/my-profile.component';
import { MyCasesComponent } from './my-cases/my-cases.component';
import { CaseDetailsComponent } from './case-details/case-details.component';
import { CaseResubmitComponent } from './case-resubmit/case-resubmit.component';
import { AvailableActionsComponent } from './available-actions/available-actions.component';

/**
 * Routes for Citizen Module
 */

const routes: Routes = [
  {
    path: '',
    component: CitizenHomeComponent,
    data: { breadcrumb: 'Home' },
  },
  {
    path: 'home',
    component: CitizenHomeComponent,
    data: { breadcrumb: 'Home' },
  },
  {
    path: 'my-profile',
    component: MyProfileComponent,
    data: { breadcrumb: 'My Profile' },
  },
  {
    path: 'services',
    data: { breadcrumb: 'Land Services' },
    component: ServicesLayoutComponent,
    children: [
      {
        path: '',
        component: LandProcessTypesComponent,
        data: { breadcrumb: 'Home' },
      },
      {
        path: 'case-form/:caseTypeId/:icon',
        component: DynamicCaseFormComponent,
        data: { breadcrumb: 'Case Form' },
      },
    ],
  },
  {
    path: 'my-cases',
    component: MyCasesComponent,
    data: { breadcrumb: 'My Cases' },
  },
  {
    path: 'cases/:id',
    component: CaseDetailsComponent,
    data: { breadcrumb: 'Case Details' },
  },
  {
    path: 'cases/:id/resubmit',
    component: CaseResubmitComponent,
    data: { breadcrumb: 'Resubmit Case' },
  },
];

/**
 * Citizen Module
 * Handles all citizen-related pages and features
 */
@NgModule({
  declarations: [
    CitizenHomeComponent,
    LandProcessTypesComponent,
    ServicesLayoutComponent,
    DynamicCaseFormComponent,
    MyProfileComponent,
    MyCasesComponent,
    CaseDetailsComponent,
    CaseResubmitComponent,
    AvailableActionsComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatRadioModule,
    MatCheckboxModule,
    SharedModule,
  ],
})
export class CitizenModule {}
