import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentsAvailableComponent } from './documents-available.component';

describe('DocumentsAvailableComponent', () => {
  let component: DocumentsAvailableComponent;
  let fixture: ComponentFixture<DocumentsAvailableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DocumentsAvailableComponent]
    });
    fixture = TestBed.createComponent(DocumentsAvailableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
