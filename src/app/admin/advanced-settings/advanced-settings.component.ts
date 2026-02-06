import { Component } from '@angular/core';

@Component({
  selector: 'app-advanced-settings',
  templateUrl: './advanced-settings.component.html',
  styleUrls: ['./advanced-settings.component.scss']
})
export class AdvancedSettingsComponent {
  loading = false;
  panelStates = {
    whatsNew: true,
    documentsAvailable: false
  };

}
