import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

// Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';

// Components
import { CitizenHomeComponent } from './citizen-home/citizen-home.component';
import { LandProcessTypesComponent } from './land-process-types/land-process-types.component';
import { SharedModule } from '../shared/shared.module';
import { ServicesLayoutComponent } from './services-layout/services-layout.component';
import { DynamicCaseFormComponent } from './dynamic-case-form/dynamic-case-form.component';
import { MyProfileComponent } from './my-profile/my-profile.component';

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
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    SharedModule,
  ],
})
export class CitizenModule {}
