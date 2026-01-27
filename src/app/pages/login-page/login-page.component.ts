import { Component, OnInit } from '@angular/core';

/**
 * Login Page Component
 * Handles user login and registration
 */
@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})
export class LoginPageComponent implements OnInit {
  activeUsers = 1250; // Active users count - can be fetched from API

  constructor() { }

  ngOnInit(): void {
    // Component initialization logic can be added here
    // TODO: Fetch active users count from API
  }
}
