import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../Services/Auth/auth.service';

@Component({
  selector: 'app-email-verify',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './email-verify.component.html',
  styleUrl: './email-verify.component.css'
})
export class EmailVerifyComponent {
  email = '';
  message = '';
  error = '';
  loading = false;

  @Output() codeSent = new EventEmitter<string>();
  @Output() back = new EventEmitter<void>();

  constructor(private auth: AuthService) {}

  sendCode() {
    this.message = '';
    this.error = '';
    this.loading = true;

    this.auth.requestPasswordReset(this.email).subscribe({
      next: () => {
        this.loading = false;
        this.message = 'Kód elküldve az email címre.';
        this.codeSent.emit(this.email);
      },
      error: (err) => {
        this.loading = false;

        this.error = err?.status === 404
          ? 'Nincs ilyen email a rendszerben.'
          : 'Hiba történt. Próbáld újra.';
      }
    });
  }
}
