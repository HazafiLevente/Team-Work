import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register-code',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register-code.component.html',
  styleUrl: './register-code.component.css'
})
export class RegisterCodeComponent {
  @Input() email = '';
  @Input() code = '';

  @Input() loading = false;
  @Input() errorMessage = '';
  @Input() successMessage = '';

  @Output() codeChange = new EventEmitter<string>();

  @Output() verify = new EventEmitter<void>();
  @Output() resend = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
}
