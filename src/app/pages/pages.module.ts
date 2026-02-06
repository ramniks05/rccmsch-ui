import { IndexComponent } from './index/index.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MAT_DATE_LOCALE } from '@angular/material/core';
// Page Components
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { SharedModule } from '../shared/shared.module';
import { LoginPageComponent } from './login-page/login-page.component';
import { CauseListComponent } from './cause-list/cause-list.component';
import { HearingCalendarComponent } from './hearing-calendar/hearing-calendar.component';

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
    CauseListComponent,
    HearingCalendarComponent
  ],
  imports: [
    RouterModule.forChild(routes),
    SharedModule
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'en-IN' }
  ]
})
export class PagesModule { }

