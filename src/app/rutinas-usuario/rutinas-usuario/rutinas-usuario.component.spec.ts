import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RutinasUsuarioComponent } from './rutinas-usuario.component';

describe('RutinasUsuarioComponent', () => {
  let component: RutinasUsuarioComponent;
  let fixture: ComponentFixture<RutinasUsuarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RutinasUsuarioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RutinasUsuarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
