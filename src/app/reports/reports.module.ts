import { NgModule } from '@angular/core';
import { ReportsHomeComponent } from './reports-home/reports-home.component';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';

/**
 * Routes for Lawyer Module
 */
const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    component: ReportsHomeComponent,
    data: { breadcrumb: 'Home' }
  }
];


@NgModule({
  declarations: [
    ReportsHomeComponent
  ],
  imports: [
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class ReportsModule { }
