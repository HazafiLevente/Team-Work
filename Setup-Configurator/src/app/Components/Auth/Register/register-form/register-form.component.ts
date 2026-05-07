import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-register-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register-form.component.html',
  styleUrl: './register-form.component.css'
})
export class RegisterFormComponent {
  @Input() fullname = '';
  @Input() username = '';
  @Input() email = '';
  @Input() password = '';

  @Input() loading = false;
  @Input() errorMessage = '';
  @Input() successMessage = '';

  showPassword = false;

  @Output() fullnameChange = new EventEmitter<string>();
  @Output() usernameChange = new EventEmitter<string>();
  @Output() emailChange = new EventEmitter<string>();
  @Output() passwordChange = new EventEmitter<string>();

  @Output() submit = new EventEmitter<void>();

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}
