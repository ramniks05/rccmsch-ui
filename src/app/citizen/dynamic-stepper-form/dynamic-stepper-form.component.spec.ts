import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamicStepperFormComponent } from './dynamic-stepper-form.component';

describe('DynamicStepperFormComponent', () => {
  let component: DynamicStepperFormComponent;
  let fixture: ComponentFixture<DynamicStepperFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DynamicStepperFormComponent]
    });
    fixture = TestBed.createComponent(DynamicStepperFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
