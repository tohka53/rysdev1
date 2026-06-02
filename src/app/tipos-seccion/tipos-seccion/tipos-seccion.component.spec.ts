import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TiposSeccionComponent } from './tipos-seccion.component';

describe('TiposSeccionComponent', () => {
  let component: TiposSeccionComponent;
  let fixture: ComponentFixture<TiposSeccionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TiposSeccionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TiposSeccionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
