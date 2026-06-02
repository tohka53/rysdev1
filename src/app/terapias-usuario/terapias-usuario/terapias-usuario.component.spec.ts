import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TerapiasUsuarioComponent } from './terapias-usuario.component';

describe('TerapiasUsuarioComponent', () => {
  let component: TerapiasUsuarioComponent;
  let fixture: ComponentFixture<TerapiasUsuarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TerapiasUsuarioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TerapiasUsuarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
