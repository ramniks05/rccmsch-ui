import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface Breadcrumb {
  label: string;
  url: string;
}

@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  breadcrumbs: Breadcrumb[] = [];

  constructor(private router: Router) {
    this.breadcrumbs = this.buildBreadCrumb(
      this.router.routerState.snapshot.root,
    );

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.breadcrumbs = this.buildBreadCrumb(
          this.router.routerState.snapshot.root,
        );
      });
  }

  private buildBreadCrumb(
    route: ActivatedRouteSnapshot,
    url: string = '',
    breadcrumbs: Breadcrumb[] = [],
  ): Breadcrumb[] {
    const children = route.children;

    if (!children || children.length === 0) {
      return breadcrumbs;
    }

    for (const child of children) {
      const routeURL = child.url.map((segment) => segment.path).join('/');

      if (routeURL) {
        url += `/${routeURL}`;
      }

      const label = child.data?.['breadcrumb'];

      if (
        label &&
        (!breadcrumbs.length ||
          breadcrumbs[breadcrumbs.length - 1].label !== label)
      ) {
        breadcrumbs.push({ label, url });
      }

      this.buildBreadCrumb(child, url, breadcrumbs);
    }

    return breadcrumbs;
  }
}
