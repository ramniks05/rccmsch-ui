import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { CommonService } from 'src/app/core/services/common-service';
import { AdminService } from 'src/app/admin/admin.service';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface CauseList {
  id: number;
  courtName: string;
  address: string;
  totalCases: number;
  hearingDate: string;
}


@Component({
  selector: 'app-cause-list',
  templateUrl: './cause-list.component.html',
  styleUrls: ['./cause-list.component.scss']
})
export class CauseListComponent implements OnInit {

  displayedColumns = ['index', 'court', 'cases', 'date'];
  dataSource = new MatTableDataSource<CauseList>([]);
  courts: any[] = [];
  selectedCourt: any;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private service: CommonService,
    private adminService: AdminService,
    private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.loadDefaultCauseList();
    this.loadCourts();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  loadDefaultCauseList(): void {
    this.service.getLatestCauseList(this.selectedCourt).subscribe(res => {
      this.dataSource.data = res;
    });
  }

  loadCourts(): void {
    this.adminService.getAllCourts().subscribe({
      next: (res) => {
        this.courts = res.data ?? [];
      },
      error: (err) => {
        console.error('Error fetching courts list:', err);
        this.snack.open('Failed to load courts list', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  // onCourtChange(): void {
  //   if (!this.selectedCourt) {
  //     this.loadDefaultCauseList();
  //     return;
  //   }

  //   this.service.getByCourt(this.selectedCourt).subscribe(res => {
  //     this.dataSource.data = res;
  //   });
  // }

  onCourtChange(e:any): void {
    if (this.selectedCourt === '' && e.target.value != '') {
      this.selectedCourt = null;
    }
    this.loadDefaultCauseList();
  }
}
