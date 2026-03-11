import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactUsQueriesComponent } from './contact-us-queries.component';

describe('ContactUsQueriesComponent', () => {
  let component: ContactUsQueriesComponent;
  let fixture: ComponentFixture<ContactUsQueriesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ContactUsQueriesComponent]
    });
    fixture = TestBed.createComponent(ContactUsQueriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
