import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-message-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: `messages.button.component.html`,
  styleUrls: ['./messages.button.component.css']
})
export class MessageButtonComponent {
  @Output() toggle = new EventEmitter<void>();
}
