import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadChildren: () => import('./pages/pages.module').then(m => m.PagesModule),
    data: { breadcrumb: 'Home' }
  },
  {
    path: 'registration',
    loadChildren: () => import('./pages/registration.module').then(m => m.RegistrationModule),
    data: { breadcrumb: 'Home' }
  },
  {
    path: 'citizen',
    loadChildren: () => import('./citizen/citizen.module').then(m => m.CitizenModule),
    data: { breadcrumb: 'Citizen' },
    canActivate: [AuthGuard]
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule),
    data: { breadcrumb: 'Admin' }
  },
  {
    path: 'officer',
    loadChildren: () => import('./officer/officer.module').then(m => m.OfficerModule),
    data: { breadcrumb: 'Officer' }
  },
  {
    path: '**',
    redirectTo: '/home'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

