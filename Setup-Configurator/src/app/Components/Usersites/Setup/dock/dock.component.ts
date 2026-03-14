import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-setup-dock',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dock.component.html',
  styleUrls: ['./dock.component.css']
})
export class SetupDockComponent {

  @Input() dockItems: { id:string, title:string }[] = [];

  @Output() open = new EventEmitter<any>();

  openDockItem(item:any){
    this.open.emit(item);
  }

}
