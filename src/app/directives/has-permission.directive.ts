// src/app/directives/has-permission.directive.ts
import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { PermissionsService } from '../services/permissions.service';

@Directive({
  selector: '[appHasPermission]'
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  private subscription = new Subscription();
  private currentUser: any = null;

  @Input('appHasPermission') permission!: string;
  @Input('appHasPermissionRoute') route: string = '';
  @Input('appHasPermissionRequireAll') requireAll: boolean = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService,
    private permissionsService: PermissionsService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser) {
      this.viewContainer.clear();
      return;
    }

    // Suscribirse a cambios en los permisos
    this.subscription.add(
      this.permissionsService.userPermissions$.subscribe(() => {
        this.updateView();
      })
    );

    this.updateView();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private async updateView(): Promise<void> {
    if (!this.currentUser || !this.permission) {
      this.viewContainer.clear();
      return;
    }

    try {
      const permissions = this.permission.split(',').map(p => p.trim());
      const route = this.route || window.location.pathname;

      if (permissions.length === 1) {
        // Un solo permiso
        const hasPermission = await this.permissionsService.hasPermission(
          this.currentUser.id,
          route,
          permissions[0]
        );
        
        if (hasPermission) {
          this.viewContainer.createEmbeddedView(this.templateRef);
        } else {
          this.viewContainer.clear();
        }
      } else {
        // Múltiples permisos
        const permissionChecks = await Promise.all(
          permissions.map(permission =>
            this.permissionsService.hasPermission(this.currentUser.id, route, permission)
          )
        );

        const hasAccess = this.requireAll
          ? permissionChecks.every(check => check)
          : permissionChecks.some(check => check);

        if (hasAccess) {
          this.viewContainer.createEmbeddedView(this.templateRef);
        } else {
          this.viewContainer.clear();
        }
      }
    } catch (error) {
      console.error('Error verificando permisos en directiva:', error);
      this.viewContainer.clear();
    }
  }
}

// src/app/directives/has-role.directive.ts
@Directive({
  selector: '[appHasRole]'
})
export class HasRoleDirective implements OnInit {
  @Input('appHasRole') roles!: string | number | (string | number)[];

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.updateView();
  }

  private updateView(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser) {
      this.viewContainer.clear();
      return;
    }

    let allowedRoles: (string | number)[] = [];
    
    if (Array.isArray(this.roles)) {
      allowedRoles = this.roles;
    } else if (typeof this.roles === 'string') {
      allowedRoles = this.roles.split(',').map(role => {
        const trimmed = role.trim();
        return isNaN(Number(trimmed)) ? trimmed : Number(trimmed);
      });
    } else {
      allowedRoles = [this.roles];
    }

    const hasRole = allowedRoles.some(role => {
      if (typeof role === 'number') {
        return currentUser.id_perfil === role;
      } else {
        // Comparar por nombre de perfil si tienes esa información
        return false; // Implementar según tus necesidades
      }
    });

    if (hasRole) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}

// src/app/directives/permission-disabled.directive.ts
@Directive({
  selector: '[appPermissionDisabled]'
})
export class PermissionDisabledDirective implements OnInit, OnDestroy {
  private subscription = new Subscription();
  private currentUser: any = null;

  @Input('appPermissionDisabled') permission!: string;
  @Input('appPermissionDisabledRoute') route: string = '';

  constructor(
    private el: any,
    private authService: AuthService,
    private permissionsService: PermissionsService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser) {
      this.disableElement();
      return;
    }

    // Suscribirse a cambios en los permisos
    this.subscription.add(
      this.permissionsService.userPermissions$.subscribe(() => {
        this.updateElement();
      })
    );

    this.updateElement();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private async updateElement(): Promise<void> {
    if (!this.currentUser || !this.permission) {
      this.disableElement();
      return;
    }

    try {
      const route = this.route || window.location.pathname;
      const hasPermission = await this.permissionsService.hasPermission(
        this.currentUser.id,
        route,
        this.permission
      );

      if (hasPermission) {
        this.enableElement();
      } else {
        this.disableElement();
      }
    } catch (error) {
      console.error('Error verificando permisos para deshabilitar elemento:', error);
      this.disableElement();
    }
  }

  private disableElement(): void {
    this.el.nativeElement.disabled = true;
    this.el.nativeElement.style.opacity = '0.5';
    this.el.nativeElement.style.cursor = 'not-allowed';
    this.el.nativeElement.title = 'No tienes permisos para esta acción';
  }

  private enableElement(): void {
    this.el.nativeElement.disabled = false;
    this.el.nativeElement.style.opacity = '1';
    this.el.nativeElement.style.cursor = 'pointer';
    this.el.nativeElement.title = '';
  }
}