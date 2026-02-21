import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../Services/Auth/auth.service';

@Component({
  selector: 'app-new-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './new-password.component.html',
  styleUrl: './new-password.component.css'
})
export class NewPasswordComponent {
  @Input() email = '';

  code = '';
  newPassword = '';
  message = '';
  error = '';
  loading = false;

  showPassword = false;

  @Output() back = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>(); // ✅ ezt használja a szülő redirecthez

  constructor(private auth: AuthService) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  resetPassword() {
    this.message = '';
    this.error = '';
    this.loading = true;

    this.auth.resetPassword(this.email, this.code, this.newPassword).subscribe({
      next: () => {
        this.loading = false;
        this.message = 'Jelszó sikeresen módosítva.';
        setTimeout(() => this.success.emit(), 500); // ✅ szülő kezeli a navigációt
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.error ?? 'Hibás kód vagy lejárt. Kérj új kódot.';
      }
    });
  }
}
