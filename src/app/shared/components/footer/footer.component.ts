import { Component, OnInit } from '@angular/core';
import { SystemSettingsService, SystemSettings } from '../../../core/services/system-settings.service';
import { Observable } from 'rxjs';

/**
 * Footer Component
 * Application footer with dynamic information from API (text, copyright, address, contact info)
 */
@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {
  settings$: Observable<SystemSettings | null>;

  constructor(private settingsService: SystemSettingsService) {
    this.settings$ = this.settingsService.getSettings();
  }

  ngOnInit(): void {}
}

