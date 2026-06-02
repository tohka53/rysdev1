import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AsignarPaqueteComponent } from './asignar-paquete.component';

describe('AsignarPaqueteComponent', () => {
  let component: AsignarPaqueteComponent;
  let fixture: ComponentFixture<AsignarPaqueteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AsignarPaqueteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AsignarPaqueteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
