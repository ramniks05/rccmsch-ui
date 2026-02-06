import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HearingCalendarComponent } from './hearing-calendar.component';

describe('HearingCalendarComponent', () => {
  let component: HearingCalendarComponent;
  let fixture: ComponentFixture<HearingCalendarComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [HearingCalendarComponent]
    });
    fixture = TestBed.createComponent(HearingCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
