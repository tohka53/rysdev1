import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarioRutinasComponent } from './calendario-rutinas.component';

describe('CalendarioRutinasComponent', () => {
  let component: CalendarioRutinasComponent;
  let fixture: ComponentFixture<CalendarioRutinasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CalendarioRutinasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarioRutinasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
