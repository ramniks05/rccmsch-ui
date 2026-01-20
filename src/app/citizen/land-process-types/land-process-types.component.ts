import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CaseTypeService } from 'src/app/core/services/case-type.services';

@Component({
  selector: 'app-land-process-types',
  templateUrl: './land-process-types.component.html',
  styleUrls: ['./land-process-types.component.scss'],
})
export class LandProcessTypesComponent {
  processes: any[] = [];
  caseTypeConfig: Record<string, { icon: string; route: string }> = {
    MUTATION_GIFT_SALE: {
      icon: 'assignment',
      route: '/citizen/services/case-form',
    },
    MUTATION_DEATH: {
      icon: 'person_off',
      route: '/citizen/services/case-form',
    },
    PARTITION: {
      icon: 'call_split',
      route: '/citizen/services/case-form',
    },
    CLASSIFICATION_CHANGE_BEFORE_2014: {
      icon: 'history',
      route: '/citizen/services/case-form',
    },
    CLASSIFICATION_CHANGE_AFTER_2014: {
      icon: 'update',
      route: '/citizen/services/case-form',
    },
    HIGHER_COURT_ORDER: {
      icon: 'gavel',
      route: '/citizen/services/case-form',
    },
    ALLOTMENT: {
      icon: 'domain',
      route: '/citizen/services/case-form',
    },
    LAND_ACQUISITION_RFCTLARR_NHA: {
      icon: 'account_balance',
      route: '/citizen/services/case-form',
    },
    LAND_ACQUISITION_DIRECT_PURCHASE: {
      icon: 'paid',
      route: '/citizen/services/case-form',
    },
  };

  constructor(
    private router: Router,
    private caseTypeService: CaseTypeService,
  ) {}

  ngOnInit(): void {
    this.getCaseTypes();
  }

  openForm(caseData: any) {
    if (!caseData?.id || !caseData?.route) {
      console.error('Invalid case data', caseData);
      return;
    }

    this.router.navigate([caseData.route, caseData.id, caseData.icon]);
  }

  getCaseTypes() {
    this.caseTypeService.getCaseTypes().subscribe({
      next: (res) => {
        this.processes = res.data
          .filter((ct: any) => ct.isActive)
          .map((ct: any) => ({
            id: ct.id,
            title: ct.name,
            code: ct.code,
            description: ct.description,
            icon: this.caseTypeConfig[ct.code]?.icon || 'description',
            route: this.caseTypeConfig[ct.code]?.route || '/cases',
          }));
      },
      error: (err) => console.error(err),
    });
  }
}
