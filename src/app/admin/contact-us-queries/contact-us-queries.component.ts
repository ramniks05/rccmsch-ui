import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../admin.service';

export interface ContactQuery {
  fullName: string;
  email: string;
  mobile: string;
  queryCategory: number;
  subject: string;
  message: string;
}

@Component({
  selector: 'app-contact-us-queries',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatInputModule,
    MatTooltipModule,
  ],
  templateUrl: './contact-us-queries.component.html',
  styleUrls: ['./contact-us-queries.component.scss']
})
export class ContactUsQueriesComponent implements OnInit {

  searchText = '';
  queries: ContactQuery[] = [];

  displayedColumns: string[] = [
    'index',
    'fullName',
    'email',
    'mobile',
    'subject',
    'queryCategory',
    'actions'
  ];

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadQueries();
  }

  loadQueries(): void {
    this.adminService.getAllQueries().subscribe({
      next: (res: any) => {
        this.queries = res.data || [];
      },
      error: (err) => {
        console.error('Error loading queries', err);
      }
    });
  }

  get filteredQueries(): ContactQuery[] {
    const term = this.searchText.toLowerCase().trim();
    if (!term) return this.queries;
    return this.queries.filter(q =>
      q.fullName.toLowerCase().includes(term) ||
      q.email.toLowerCase().includes(term) ||
      q.subject.toLowerCase().includes(term) ||
      q.mobile.includes(term)
    );
  }

  getInitials(name: string): string {
    return name.trim().slice(0, 2).toUpperCase();
  }

  getCategoryLabel(category: number): string {
    const map: Record<number, string> = {
      1: 'Case Filing Issue',
      2: 'Account / Registration',
      3: 'Document Upload Problem',
      4: 'Hearing / Cause List',
      5: 'Payment & Court Fees',
      6: 'Technical / Portal Error',
      7: 'Order / Certified Copy',
      8: 'Other'
    };
    return map[category] ?? `Category ${category}`;
  }

  viewQuery(query: ContactQuery): void {
    console.log('View Query', query);
  }

  replyQuery(query: ContactQuery): void {
    console.log('Reply Query', query);
  }
}
