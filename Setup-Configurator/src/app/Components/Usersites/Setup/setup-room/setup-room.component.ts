import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  AfterViewInit,
  ViewChild
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import {FormsModule} from '@angular/forms';

export type SetupRightClickPayload = {
  setup: any;
  x: number;
  y: number;
};

@Component({
  selector: 'app-setup-room',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule],
  templateUrl: './setup-room.component.html',
  styleUrls: ['./setup-room.component.css']
})
export class SetupRoomComponent implements AfterViewInit {

  @Input() setup: any;
  @Input() dataId = '';
  @Input() boundaryRef!: HTMLElement;

  @Input() dragDisabled = false;

  @Input() initialPosition: { x: number, y: number } = { x: 0, y: 0 };

  @Output() elementReady = new EventEmitter<{id:string, el:HTMLElement}>();
  @Output() moved = new EventEmitter<void>();
  @Output() dragEnded = new EventEmitter<{x:number,y:number}>();

  @Output() setupClick = new EventEmitter<any>();
  @Output() setupDblClick = new EventEmitter<any>();
  @Output() setupRightClick = new EventEmitter<SetupRightClickPayload>();

  @Output() renamed = new EventEmitter<any>();


  dragPosition = { x: 0, y: 0 };
  editing = false;
  editName = '';

  @ViewChild('root',{static:true}) root!:ElementRef;

  ngAfterViewInit(){
    this.elementReady.emit({
      id:this.dataId,
      el:this.root.nativeElement
    });
  }
  ngOnInit(){
    if(this.initialPosition){
      this.dragPosition = {...this.initialPosition};
    }
  }

  isNetwork(): boolean {
    return String(this.setup?.isNetwork).toLowerCase() === 'true' || this.setup?.isNetwork === true;
  }
  startRename(): void {

    this.editing = true;

    this.editName =
      this.setup?.display_name ||
      this.setup?.setup_name ||
      this.setup?.name ||
      '';

    setTimeout(() => {
      const input = this.root.nativeElement.querySelector('input');
      input?.focus();
      input?.select();
    });
  }
  confirmRename(): void {

    if (!this.editing) return;

    this.editing = false;

    const newName = (this.editName || '').trim();

    if (!newName) return;

    this.renamed.emit({
      ...this.setup,
      setup_name: newName,
      display_name: newName
    });
  }
  cancelRename(): void {
    this.editing = false;
  }
  onDragStarted(): void {
    if (this.editing) {
      this.cancelRename();
    }
  }

  onDragMoved(){
    this.moved.emit();
  }

  onDragEnded(e:any){

    const pos = e.source.getFreeDragPosition();

    this.dragPosition = pos;

    this.dragEnded.emit({
      x: pos.x,
      y: pos.y
    });

  }

  onClick(): void {
    this.setupClick.emit(this.setup);
  }

  onDblClick(): void {
    this.setupDblClick.emit(this.setup);
  }

  onRightClick(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();

    this.setupRightClick.emit({
      setup: this.setup,
      x: e.clientX,
      y: e.clientY
    });
  }


}
