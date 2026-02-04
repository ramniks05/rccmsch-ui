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
import { MatRadioModule } from '@angular/material/radio';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSortModule } from '@angular/material/sort';

import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { MaskEmailPipe } from '../core/pipes/mask-email.pipe';
import { BreadcrumbsComponent } from './components/breadcrumbs/breadcrumbs.component';
import { JsonParsePipe } from '../core/pipes/json-parse.pipe';
import { NgChartsModule } from 'ng2-charts';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';

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
    JsonParsePipe,
  ],
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatExpansionModule,
    MatCardModule,
    MatSelectModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatRadioModule,
    MatDividerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatStepperModule,
    MatDialogModule,
    MatPaginatorModule,
    MatTableModule,
    MatProgressBarModule,
    MatChipsModule,
    MatBadgeModule,
    MatButtonToggleModule,
    MatTooltipModule,     // ← ADDED
    MatSortModule,        // ← ADDED
    // NgChartsModule     // ← OPTIONAL: Add if you want to share chart.js across modules
  ],
  exports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,

    // Components & Pipes
    HeaderComponent,
    FooterComponent,
    BreadcrumbsComponent,
    MaskEmailPipe,
    JsonParsePipe,

    // Angular / Router
    RouterModule,

    // Angular Material
    MatToolbarModule,
    MatExpansionModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatRadioModule,
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
    JsonParsePipe,
    MatProgressBarModule,
    MatChipsModule,
    MatBadgeModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatSortModule,
  ]
})
export class SharedModule { }
