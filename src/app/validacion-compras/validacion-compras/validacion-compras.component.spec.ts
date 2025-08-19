import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidacionComprasComponent } from './validacion-compras.component';

describe('ValidacionComprasComponent', () => {
  let component: ValidacionComprasComponent;
  let fixture: ComponentFixture<ValidacionComprasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ValidacionComprasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValidacionComprasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
