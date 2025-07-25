import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MisTerapiasComponent } from './mis-terapias.component';

describe('MisTerapiasComponent', () => {
  let component: MisTerapiasComponent;
  let fixture: ComponentFixture<MisTerapiasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MisTerapiasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MisTerapiasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
