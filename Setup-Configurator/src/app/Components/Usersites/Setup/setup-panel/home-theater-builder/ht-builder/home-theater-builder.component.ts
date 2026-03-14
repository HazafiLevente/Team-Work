import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-home-theater-builder',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './home-theater-builder.component.html',
  styleUrls: ['./home-theater-builder.component.css']
})
export class HomeTheaterBuilderComponent {
  speakers = [
    { name: 'Front', x: 100, y: 100, rotation: 0 },
    { name: 'Front', x: 600, y: 100, rotation: 0 },
    { name: 'Subwoofer', x: 100, y: 400, rotation: 0 },
    { name: 'Rear', x: 600, y: 400, rotation: 0 }
  ];

  rotate(s: any): void {
    s.rotation += 45;
  }
}
