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
import { AboutComponent } from './about/about.component';
import { FaqComponent } from './faq/faq.component';
import { ContactComponent } from './contact/contact.component';
import { DocumentsComponent } from './documents/documents.component';
import { WhatsNewComponent } from './whats-new/whats-new.component';

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
    path: 'about',
    component: AboutComponent,
    data: { breadcrumb: 'About' }
  },
  {
    path: 'faq',
    component: FaqComponent,
    data: { breadcrumb: 'FAQ' }
  },
  {
    path: 'contact',
    component: ContactComponent,
    data: { breadcrumb: 'Contact Us' }
  },
  {
    path: 'documents',
    component: DocumentsComponent,
    data: { breadcrumb: 'Documents' }
  },
  {
    path: 'cause-list',
    component: CauseListComponent,
    data: { breadcrumb: 'Cause List' }
  },
  {
    path: 'hearing-calendar',
    component: HearingCalendarComponent,
    data: { breadcrumb: 'Hearing Calendar' }
  },
  {
    path: 'whats-new',
    component: WhatsNewComponent,
    data: { breadcrumb: 'What\'s New' }
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
    HearingCalendarComponent,
    AboutComponent,
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

