import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-setup-device-type-modal',
  standalone: true,
  templateUrl: './setup-device-type-modal.component.html',
  styleUrls: ['./setup-device-type-modal.component.css']
})
export class SetupDeviceTypeModalComponent {

  @Output() close = new EventEmitter<void>();
  @Output() select = new EventEmitter<string>();

  closeModal(){
    this.close.emit();
  }

  pc(){
    this.select.emit('pc');
  }

  ht(){
    this.select.emit('home-theater');
  }

  car(){
    this.select.emit('car');
  }

  studio(){
    this.select.emit('studio');
  }

  other(){
    this.select.emit('other');
  }

}
