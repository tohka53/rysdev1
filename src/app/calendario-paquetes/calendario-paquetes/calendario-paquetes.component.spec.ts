import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarioPaquetesComponent } from './calendario-paquetes.component';

describe('CalendarioPaquetesComponent', () => {
  let component: CalendarioPaquetesComponent;
  let fixture: ComponentFixture<CalendarioPaquetesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CalendarioPaquetesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarioPaquetesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
