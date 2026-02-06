import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { CommonService } from 'src/app/core/services/common-service';

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
  courts: string[] = [];
  selectedCourt = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private service: CommonService) {}

  ngOnInit(): void {
    this.loadDefault();
    this.loadCourts();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  loadDefault(): void {
    this.service.getLatest().subscribe(res => {
      this.dataSource.data = res;
    });
  }

  loadCourts(): void {
    this.service.getCourts().subscribe(res => this.courts = res);
  }

  onCourtChange(): void {
    if (!this.selectedCourt) {
      this.loadDefault();
      return;
    }

    this.service.getByCourt(this.selectedCourt).subscribe(res => {
      this.dataSource.data = res;
    });
  }
}
