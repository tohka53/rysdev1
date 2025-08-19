import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompraPaquetesComponent } from './compra-paquetes.component';

describe('CompraPaquetesComponent', () => {
  let component: CompraPaquetesComponent;
  let fixture: ComponentFixture<CompraPaquetesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CompraPaquetesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompraPaquetesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
