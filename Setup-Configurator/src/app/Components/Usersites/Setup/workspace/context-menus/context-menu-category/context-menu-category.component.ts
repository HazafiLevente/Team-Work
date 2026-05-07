import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContextMenuBaseComponent } from '../context-menu-base/context-menu-base.component';

@Component({
    selector: 'app-context-menu-category',
    standalone: true,
    imports: [CommonModule, ContextMenuBaseComponent],
    templateUrl: './context-menu-category.component.html',
    styleUrl: './context-menu-category.component.css'
})
export class ContextMenuCategoryComponent {
    @Input() x = 0;
    @Input() y = 0;

    @Output() close = new EventEmitter<void>();
    @Output() categorySelected = new EventEmitter<string>();

    selectCategory(category: string) {
        this.categorySelected.emit(category);
        this.close.emit();
    }
}
