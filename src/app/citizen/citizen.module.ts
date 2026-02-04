import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
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
import { DynamicStepperFormComponent } from './dynamic-stepper-form/dynamic-stepper-form.component';
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
        path: 'case-form/:caseTypeId/:icon/:title',
        component: DynamicCaseFormComponent,
        data: { breadcrumb: 'Case Form' },
      },
      {
        path: 'stepper-case-form/:caseTypeId/:icon/:title',
        component: DynamicStepperFormComponent,
        data: { breadcrumb: 'Case Form' }
      }
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
    DynamicStepperFormComponent,
    AvailableActionsComponent,
  ],
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
  ],
})
export class CitizenModule {}
