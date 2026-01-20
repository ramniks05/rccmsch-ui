import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamicCaseFormComponent } from './dynamic-case-form.component';

describe('DynamicCaseFormComponent', () => {
  let component: DynamicCaseFormComponent;
  let fixture: ComponentFixture<DynamicCaseFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DynamicCaseFormComponent]
    });
    fixture = TestBed.createComponent(DynamicCaseFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
