import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AsignacionesListaComponent } from './asignaciones-lista.component';

describe('AsignacionesListaComponent', () => {
  let component: AsignacionesListaComponent;
  let fixture: ComponentFixture<AsignacionesListaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AsignacionesListaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AsignacionesListaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
