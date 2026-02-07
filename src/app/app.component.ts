import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { ViewportScroller } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  showHeader: boolean = false;
  showBreadCrumbs: boolean = false;
  
  constructor(
    private router: Router,
    private viewportScroller: ViewportScroller
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        const hiddenRoutes = ['/home', '/error'];
        this.showHeader = !hiddenRoutes.includes(event.urlAfterRedirects);
        const hiddenBreadRoutes = ['/home', '/admin/home'];
        this.showBreadCrumbs = !hiddenBreadRoutes.includes(event.urlAfterRedirects);
      }
    });
  }
  
  ngOnInit(): void {
    // Scroll to top on route change
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.viewportScroller.scrollToPosition([0, 0]);
    });
  }
}
