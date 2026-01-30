import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-searchbutton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './searchbutton.component.html',
  styleUrls: ['./searchbutton.component.css']
})
export class SearchbuttonComponent {
  @Output() clicked = new EventEmitter<void>();

  onClick(): void {
    this.clicked.emit();
  }
}
