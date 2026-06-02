import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarioTerapiasComponent } from './calendario-terapias.component';

describe('CalendarioTerapiasComponent', () => {
  let component: CalendarioTerapiasComponent;
  let fixture: ComponentFixture<CalendarioTerapiasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CalendarioTerapiasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarioTerapiasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
