import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import * as XLSX from 'xlsx';

export interface CaseReport {
  id: number;
  caseNumber: string;
  caseTitle: string;
  courtName: string;
  courtLevel: string;
  filingDate: string;
  status: string;
  petitioner: string;
  respondent: string;
  nextHearingDate: string;
}

export interface ReportSummary {
  totalCases: number;
  activeCases: number;
  disposedCases: number;
  pendingCases: number;
  hearingsToday: number;
  newThisMonth: number;
}

@Component({
  selector: 'app-reports-home',
  templateUrl: './reports-home.component.html',
  styleUrls: ['./reports-home.component.scss']
})
export class ReportsHomeComponent implements OnInit, AfterViewInit {

  displayedColumns: string[] = [
    'id', 'caseNumber', 'caseTitle', 'courtName',
    'courtLevel', 'filingDate', 'status', 'nextHearingDate', 'actions'
  ];

  dataSource = new MatTableDataSource<CaseReport>([]);

  private _paginator!: MatPaginator;
  private _sort!: MatSort;

  @ViewChild(MatPaginator)
  set paginator(p: MatPaginator) {
    if (p) {
      this._paginator = p;
      this.dataSource.paginator = p;
    }
  }

  @ViewChild(MatSort)
  set sort(s: MatSort) {
    if (s) {
      this._sort = s;
      this.dataSource.sort = s;
    }
  }

  isLoading = false;
  errorMessage = '';

  summary: ReportSummary = {
    totalCases: 0,
    activeCases: 0,
    disposedCases: 0,
    pendingCases: 0,
    hearingsToday: 0,
    newThisMonth: 0
  };

  // Filter options
  selectedStatus = '';
  selectedCourtLevel = '';
  dateFrom = '';
  dateTo = '';

  statusOptions = ['FILED', 'PENDING', 'HEARING', 'DISPOSED', 'ADJOURNED'];
  courtLevelOptions = ['CIRCLE', 'SUB_DIVISION', 'DISTRICT', 'STATE'];

  constructor() {}

  ngOnInit(): void {
    this.loadReports();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private MOCK_CASES: CaseReport[] = [
    { id: 1,  caseNumber: 'RC/2024/001', caseTitle: 'Land Dispute - Kumbi Village',         courtName: 'SDC Court Kumbi',      courtLevel: 'CIRCLE',       filingDate: '2024-01-15', status: 'PENDING',   petitioner: 'Rajkumar Singh',    respondent: 'Moirangthem Ibomcha', nextHearingDate: '2025-03-10' },
    { id: 2,  caseNumber: 'RC/2024/002', caseTitle: 'Property Boundary Dispute',             courtName: 'DC Court Imphal West', courtLevel: 'DISTRICT',     filingDate: '2024-02-20', status: 'HEARING',   petitioner: 'Laishram Devi',     respondent: 'Konsam Tombi',        nextHearingDate: '2025-02-28' },
    { id: 3,  caseNumber: 'RC/2024/003', caseTitle: 'Agricultural Land Encroachment',        courtName: 'SDO Court Bishnupur', courtLevel: 'SUB_DIVISION', filingDate: '2024-03-05', status: 'DISPOSED',  petitioner: 'Yumnam Ibungomba',  respondent: 'Thounaojam Rajen',   nextHearingDate: '' },
    { id: 4,  caseNumber: 'RC/2024/004', caseTitle: 'Revenue Record Correction',             courtName: 'Revenue Tribunal',    courtLevel: 'STATE',        filingDate: '2024-03-18', status: 'FILED',     petitioner: 'Ngangom Sanajaoba', respondent: 'State of Chandigarh',   nextHearingDate: '2025-03-15' },
    { id: 5,  caseNumber: 'RC/2024/005', caseTitle: 'Patta Transfer Objection',              courtName: 'SDC Court Nambol',    courtLevel: 'CIRCLE',       filingDate: '2024-04-10', status: 'ADJOURNED', petitioner: 'Wangkhem Priya',    respondent: 'Oinam Suresh',        nextHearingDate: '2025-03-05' },
    { id: 6,  caseNumber: 'RC/2024/006', caseTitle: 'Inheritance and Succession Dispute',    courtName: 'DC Court Thoubal',    courtLevel: 'DISTRICT',     filingDate: '2024-05-22', status: 'PENDING',   petitioner: 'Huidrom Shyamsana', respondent: 'Huidrom Bimol',      nextHearingDate: '2025-03-20' },
    { id: 7,  caseNumber: 'RC/2024/007', caseTitle: 'Flood Compensation Land Claim',         courtName: 'SDO Court Kakching', courtLevel: 'SUB_DIVISION', filingDate: '2024-06-01', status: 'HEARING',   petitioner: 'Thangjam Lata',     respondent: 'Govt. of Chandigarh',   nextHearingDate: '2025-02-25' },
    { id: 8,  caseNumber: 'RC/2024/008', caseTitle: 'Forest Land Mutation Appeal',           courtName: 'Revenue Tribunal',    courtLevel: 'STATE',        filingDate: '2024-06-14', status: 'FILED',     petitioner: 'Sipahi Meitei',     respondent: 'Forest Dept.',        nextHearingDate: '2025-04-01' },
    { id: 9,  caseNumber: 'RC/2024/009', caseTitle: 'Partition Suit - Joint Family Property',courtName: 'SDC Court Moirang',   courtLevel: 'CIRCLE',       filingDate: '2024-07-07', status: 'DISPOSED',  petitioner: 'Khuraijam Tomba',   respondent: 'Khuraijam Ranjit',   nextHearingDate: '' },
    { id: 10, caseNumber: 'RC/2024/010', caseTitle: 'Benami Transaction Challenge',          courtName: 'DC Court Churachandpur', courtLevel: 'DISTRICT',  filingDate: '2024-07-25', status: 'PENDING',   petitioner: 'Tonsing Haokip',    respondent: 'Chongtham Anand',    nextHearingDate: '2025-03-12' },
    { id: 11, caseNumber: 'RC/2024/011', caseTitle: 'Lease Renewal Dispute',                 courtName: 'SDO Court Moreh',     courtLevel: 'SUB_DIVISION', filingDate: '2024-08-03', status: 'HEARING',   petitioner: 'Baite Paolienlal',  respondent: 'Zou Thangkholun',    nextHearingDate: '2025-02-27' },
    { id: 12, caseNumber: 'RC/2024/012', caseTitle: 'Revenue Court Jurisdiction Appeal',     courtName: 'Revenue Tribunal',    courtLevel: 'STATE',        filingDate: '2024-08-19', status: 'ADJOURNED', petitioner: 'Nongmaithem Biren', respondent: 'Pebam Suresh',       nextHearingDate: '2025-03-18' },
    { id: 13, caseNumber: 'RC/2024/013', caseTitle: 'Crop Damage Compensation Claim',        courtName: 'SDC Court Wangoi',    courtLevel: 'CIRCLE',       filingDate: '2024-09-10', status: 'FILED',     petitioner: 'Leishangthem Devi', respondent: 'Irrigation Dept.',   nextHearingDate: '2025-04-05' },
    { id: 14, caseNumber: 'RC/2024/014', caseTitle: 'Road Acquisition Land Compensation',    courtName: 'DC Court Senapati',   courtLevel: 'DISTRICT',     filingDate: '2024-09-28', status: 'PENDING',   petitioner: 'Naga Longkumer',    respondent: 'PWD Chandigarh',        nextHearingDate: '2025-03-22' },
    { id: 15, caseNumber: 'RC/2025/001', caseTitle: 'Cadastral Survey Correction',           courtName: 'SDO Court Jiribam',   courtLevel: 'SUB_DIVISION', filingDate: '2025-01-08', status: 'FILED',     petitioner: 'Meitei Pangangba',  respondent: 'Survey & Settlement', nextHearingDate: '2025-03-30' },
    { id: 16, caseNumber: 'RC/2025/002', caseTitle: 'Tenancy Rights Enforcement',            courtName: 'SDC Court Lilong',    courtLevel: 'CIRCLE',       filingDate: '2025-01-20', status: 'HEARING',   petitioner: 'Wahengbam Tombi',   respondent: 'Yengkhoikhomba',     nextHearingDate: '2025-02-24' },
    { id: 17, caseNumber: 'RC/2025/003', caseTitle: 'Mortgage Redemption Dispute',           courtName: 'DC Court Imphal East',courtLevel: 'DISTRICT',     filingDate: '2025-02-01', status: 'FILED',     petitioner: 'Oinam Ibomcha',     respondent: 'Naorem Ranjit',      nextHearingDate: '2025-03-25' },
    { id: 18, caseNumber: 'RC/2025/004', caseTitle: 'Common Land Encroachment',              courtName: 'SDC Court Andro',     courtLevel: 'CIRCLE',       filingDate: '2025-02-10', status: 'PENDING',   petitioner: 'Thokchom Sana',     respondent: 'Village Council',    nextHearingDate: '2025-03-08' },
  ];

  loadReports(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Simulate async load
    setTimeout(() => {
      this.isLoading = false;
      this.dataSource.data = this.MOCK_CASES;
      this.computeSummary(this.MOCK_CASES);
    }, 600);
  }

  computeSummary(cases: CaseReport[]): void {
    const today = new Date().toISOString().split('T')[0];
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    this.summary = {
      totalCases: cases.length,
      activeCases: cases.filter(c => ['PENDING', 'HEARING', 'FILED'].includes(c.status)).length,
      disposedCases: cases.filter(c => c.status === 'DISPOSED').length,
      pendingCases: cases.filter(c => c.status === 'PENDING').length,
      hearingsToday: cases.filter(c => c.nextHearingDate === today).length,
      newThisMonth: cases.filter(c => c.filingDate >= thisMonthStart).length
    };
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  applyStatusFilter(): void {
    this.dataSource.filterPredicate = (data: CaseReport, filter: string) => {
      const matchStatus = !this.selectedStatus || data.status === this.selectedStatus;
      const matchLevel = !this.selectedCourtLevel || data.courtLevel === this.selectedCourtLevel;
      return matchStatus && matchLevel;
    };
    this.dataSource.filter = Math.random().toString();
  }

  clearFilters(): void {
    this.selectedStatus = '';
    this.selectedCourtLevel = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.dataSource.filterPredicate = (data, filter) =>
      JSON.stringify(data).toLowerCase().includes(filter.toLowerCase());
    this.dataSource.filter = '';
  }

  viewCase(caseItem: CaseReport): void {
    // Navigate to case detail
    console.log('View case:', caseItem);
  }

  exportReport(): void {
    const date = new Date().toISOString().split('T')[0];

    // Sheet 1 — Cases (exports currently filtered/visible data)
    const caseRows = this.dataSource.filteredData.map(c => ({
      'ID':                c.id,
      'Case Number':       c.caseNumber,
      'Case Title':        c.caseTitle,
      'Court Name':        c.courtName,
      'Court Level':       c.courtLevel,
      'Petitioner':        c.petitioner,
      'Respondent':        c.respondent,
      'Filing Date':       c.filingDate,
      'Status':            c.status,
      'Next Hearing Date': c.nextHearingDate || '-',
    }));

    const caseSheet = XLSX.utils.json_to_sheet(caseRows);

    // Sheet 2 — Summary stats
    const summaryRows = [
      { 'Metric': 'Total Cases',    'Count': this.summary.totalCases    },
      { 'Metric': 'Active Cases',   'Count': this.summary.activeCases   },
      { 'Metric': 'Disposed Cases', 'Count': this.summary.disposedCases },
      { 'Metric': 'Pending Cases',  'Count': this.summary.pendingCases  },
      { 'Metric': 'Hearings Today', 'Count': this.summary.hearingsToday },
      { 'Metric': 'New This Month', 'Count': this.summary.newThisMonth  },
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);

    const workbook: XLSX.WorkBook = {
      Sheets: {
        'Cases Report': caseSheet,
        'Summary':      summarySheet,
      },
      SheetNames: ['Cases Report', 'Summary'],
    };

    XLSX.writeFile(workbook, `Cases_Report_${date}.xlsx`);
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      FILED: 'status-filed',
      PENDING: 'status-pending',
      HEARING: 'status-hearing',
      DISPOSED: 'status-disposed',
      ADJOURNED: 'status-adjourned'
    };
    return map[status] || 'status-default';
  }

  getLevelClass(level: string): string {
    const map: Record<string, string> = {
      STATE: 'level-state',
      DISTRICT: 'level-district',
      SUB_DIVISION: 'level-sub-division',
      CIRCLE: 'level-circle'
    };
    return map[level] || '';
  }

}
