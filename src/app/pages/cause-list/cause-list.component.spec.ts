import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CauseListComponent } from './cause-list.component';

describe('CauseListComponent', () => {
  let component: CauseListComponent;
  let fixture: ComponentFixture<CauseListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CauseListComponent]
    });
    fixture = TestBed.createComponent(CauseListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
