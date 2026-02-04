import { IndexComponent } from './index/index.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MAT_DATE_LOCALE } from '@angular/material/core';
// Page Components
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { SharedModule } from '../shared/shared.module';
import { LoginPageComponent } from './login-page/login-page.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { NgChartsModule } from 'ng2-charts';

/**
 * Routes for Pages Module
 * Handles /home route (shows HomeComponent) and /login route (shows LoginPageComponent)
 */
const routes: Routes = [
  {
    path: '',
    component: IndexComponent,
    data: { breadcrumb: 'Home' }
  },
  // {
  //   path: 'home',
  //   component: HomeComponent,
  //   data: { breadcrumb: 'Home' }
  // },
  {
    path: 'login',
    component: LoginPageComponent,
    data: { breadcrumb: 'Login' }
  },
  {
    path: 'index',
    component: IndexComponent,
    data: { breadcrumb: 'Index' }
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    data: { breadcrumb: 'Dashboard' }
  }
];

/**
 * Pages Module
 * Contains all page-level components
 */
@NgModule({
  declarations: [
    HomeComponent,
    LoginComponent,
    IndexComponent,
    LoginPageComponent,
    DashboardComponent
  ],
  imports: [
    RouterModule.forChild(routes),
    MatCardModule,
    MatButtonModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatRadioModule,
    MatProgressSpinnerModule,
    SharedModule,
    NgChartsModule
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'en-IN' }
  ]
})
export class PagesModule { }

