import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InformacionMedicaUsuariosComponent } from './informacion-medica-usuarios.component';

describe('InformacionMedicaUsuariosComponent', () => {
  let component: InformacionMedicaUsuariosComponent;
  let fixture: ComponentFixture<InformacionMedicaUsuariosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InformacionMedicaUsuariosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InformacionMedicaUsuariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
