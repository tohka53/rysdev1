import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaqueteFormComponent } from './paquete-form.component';

describe('PaqueteFormComponent', () => {
  let component: PaqueteFormComponent;
  let fixture: ComponentFixture<PaqueteFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PaqueteFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaqueteFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
