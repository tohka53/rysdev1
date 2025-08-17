import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Profile } from '../../interfaces/user.interfaces';

@Component({
  selector: 'app-avatar',
  standalone: false,
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.css']
})
export class AvatarComponent {
  @Input() user: Profile | null = null;
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() editable: boolean = false;
  @Input() showName: boolean = false;
  @Input() clickable: boolean = false;
  @Output() avatarUpdated = new EventEmitter<Profile>();
  @Output() avatarClicked = new EventEmitter<Profile>();

  isUploading = false;

  constructor(private authService: AuthService) {}

  get sizeClasses(): string {
    const sizes = {
      xs: 'w-6 h-6',
      sm: 'w-8 h-8',
      md: 'w-12 h-12',
      lg: 'w-16 h-16',
      xl: 'w-24 h-24'
    };
    return sizes[this.size];
  }

  get textSizeClasses(): string {
    const textSizes = {
      xs: 'text-xs',
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
      xl: 'text-xl'
    };
    return textSizes[this.size];
  }

  get editButtonSizeClasses(): string {
    const buttonSizes = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
      xl: 'w-7 h-7'
    };
    return buttonSizes[this.size];
  }

  get avatarUrl(): string {
    return this.authService.getAvatarUrl(this.user || undefined);
  }

  get initials(): string {
    return this.authService.getUserInitials(this.user || undefined);
  }

  get containerClasses(): string {
    let classes = 'relative inline-block ' + this.sizeClasses;
    if (this.clickable) {
      classes += ' cursor-pointer';
    }
    return classes;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0] && this.editable) {
      this.uploadAvatar(input.files[0]);
    }
  }

  async uploadAvatar(file: File): Promise<void> {
    if (!this.editable || !this.user) return;

    this.isUploading = true;
    
    try {
      const result = await this.authService.updateUserAvatar(file);
      
      if (result.success && result.user) {
        this.avatarUpdated.emit(result.user);
        console.log(result.message);
      } else {
        console.error(result.message);
        alert(result.message);
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Error al subir la imagen');
    } finally {
      this.isUploading = false;
    }
  }

  onAvatarClick(): void {
    if (this.clickable && this.user) {
      this.avatarClicked.emit(this.user);
    }
  }
}