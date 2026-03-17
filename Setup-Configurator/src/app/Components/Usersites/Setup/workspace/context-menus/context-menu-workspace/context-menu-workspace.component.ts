import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ContextMenuBaseComponent } from '../context-menu-base/context-menu-base.component';

@Component({
  selector: 'app-context-menu-workspace',
  standalone: true,
  imports: [ContextMenuBaseComponent],
  templateUrl: './context-menu-workspace.component.html',
  styleUrls: ['./context-menu-workspace.component.css']
})
export class ContextMenuWorkspaceComponent {

  @Input() x = 0;
  @Input() y = 0;
  @Input() isInsideSetup = false;

  @Output() close = new EventEmitter<void>();
  @Output() createSetup = new EventEmitter<void>();
  @Output() categorySelected = new EventEmitter<string>();

  emitAndClose() {
    this.createSetup.emit();
    this.close.emit();
  }

  selectCategory(category: string) {
    this.categorySelected.emit(category);
    this.close.emit();
  }

}
