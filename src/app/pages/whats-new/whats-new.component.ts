import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AdvancedSettingsService } from 'src/app/core/services/advanced-settings.service';
import { SharedModule } from 'src/app/shared/shared.module';

@Component({
  selector: 'app-whats-new',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './whats-new.component.html',
  styleUrls: ['./whats-new.component.scss']
})
export class WhatsNewComponent {
  showButton: boolean = true;
  customClass: any = '';

  constructor(
    private advancedSettingsService: AdvancedSettingsService,
    private snack: MatSnackBar,
    private router: Router
  ) {}

  whatsNewList: any[] = [];

  ngOnInit(): void {
    const url = this.router.url;
    this.customClass = url === '/home/whats-new' ? 'whats-new-style' : '';
    if (url === '/home/whats-new') {
      this.showButton = false;
    }
    this.getWhatsNewData();
  }

  getWhatsNewData(): void {
    this.advancedSettingsService.getAllWhatsNew().subscribe({
      next: (res) => {
        this.whatsNewList = res.data ?? [];
      },
      error: (err) => {
        console.error('Error loading data:', err);
        this.snack.open('Failed to load announcements', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }
}
