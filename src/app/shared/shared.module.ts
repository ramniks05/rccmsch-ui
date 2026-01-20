import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Angular Material Modules
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
// import { ViewDialogComponent } from './components/view-dialog/view-dialog.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
// import { DeleteDialogComponent } from './components/delete-dialog/delete-dialog.component';

// Shared Components
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { MaskEmailPipe } from '../core/pipes/mask-email.pipe';
import { BreadcrumbsComponent } from './components/breadcrumbs/breadcrumbs.component';
import { JsonParsePipe } from '../core/pipes/json-parse.pipe';

/**
 * Shared Module
 * Contains reusable components, directives, and pipes used across the application
 */
@NgModule({
  declarations: [
    HeaderComponent,
    FooterComponent,
    MaskEmailPipe,
    BreadcrumbsComponent,
    JsonParsePipe
  ],
  imports: [
    ReactiveFormsModule,
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatExpansionModule,
    MatCardModule,
    MatCardModule,
    MatSelectModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatDividerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatStepperModule,
    MatDialogModule,
    MatPaginatorModule,
    MatTableModule
  ],
  exports: [
    ReactiveFormsModule,
    HeaderComponent,
    FooterComponent,
    MatExpansionModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatDividerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatMenuModule,
    MatStepperModule,
    MatDialogModule,
    MatPaginatorModule,
    MatTableModule,
    MaskEmailPipe,
    BreadcrumbsComponent,
    JsonParsePipe
  ]
})
export class SharedModule { }

