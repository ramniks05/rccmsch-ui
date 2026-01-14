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

import { OfficerGuard } from '../core/guards/officer.guard';
import { OfficerResetPasswordComponent } from './officer-reset-password/officer-reset-password.component';
import { OfficerHomeComponent } from './officer-home/officer-home.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    component: OfficerHomeComponent,
    canActivate: [OfficerGuard]
  },
  {
    path: 'reset-password',
    component: OfficerResetPasswordComponent
  }
];

@NgModule({
  declarations: [
    OfficerResetPasswordComponent,
    OfficerHomeComponent
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
    MatProgressSpinnerModule
  ]
})
export class OfficerModule { }


