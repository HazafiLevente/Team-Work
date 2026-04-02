import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-setup-hierarchy-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './setup-hierarchy-sidebar.component.html',
  styleUrls: ['./setup-hierarchy-sidebar.component.css']
})
export class SetupHierarchySidebarComponent {
  @Input() hierarchyMode = false;
  @Input() rootTreeExpanded = true;
  @Input() userSetups: any[] = [];
  @Input() hierarchyRootCtxOpen = false;
  @Input() hierarchyRootCtxX = 0;
  @Input() hierarchyRootCtxY = 0;
  @Input() hierarchySetupCtxOpen = false;
  @Input() hierarchySetupCtxX = 0;
  @Input() hierarchySetupCtxY = 0;
  @Input() hierarchyCategoryPickerSetup: any = null;
  @Input() hierarchyCategories: string[] = [];

  @Input() setupTitleFn: (setup: any) => string = (setup) => setup?.setup_name ?? setup?.name ?? 'Setup';
  @Input() itemTitleFn: (item: any) => string = (item) => item?.name ?? item?.display_name ?? 'Eszkoz';
  @Input() isTreeExpandedFn: (setup: any) => boolean = () => false;
  @Input() isTreeLoadingFn: (setup: any) => boolean = () => false;
  @Input() treeChildrenForFn: (setup: any) => any[] = () => [];

  @Output() hierarchyModeChange = new EventEmitter<boolean>();
  @Output() rootToggle = new EventEmitter<MouseEvent>();
  @Output() rootRightClick = new EventEmitter<MouseEvent>();
  @Output() setupToggle = new EventEmitter<{ setup: any; event: MouseEvent }>();
  @Output() setupSelect = new EventEmitter<{ setup: any; event: MouseEvent }>();
  @Output() setupRightClick = new EventEmitter<{ setup: any; event: MouseEvent }>();
  @Output() itemSelect = new EventEmitter<{ item: any; event: MouseEvent }>();
  @Output() createSetupFromRoot = new EventEmitter<void>();
  @Output() openSetup = new EventEmitter<void>();
  @Output() openCategoryPicker = new EventEmitter<void>();
  @Output() renameSetup = new EventEmitter<void>();
  @Output() deleteSetup = new EventEmitter<void>();
  @Output() closeHierarchyCategoryPicker = new EventEmitter<void>();
  @Output() selectHierarchyCategory = new EventEmitter<string>();

  onModeChange(event: Event): void {
    const checked = !!(event.target as HTMLInputElement | null)?.checked;
    this.hierarchyModeChange.emit(checked);
  }

  setupTitle(setup: any): string {
    return this.setupTitleFn(setup);
  }

  itemTitle(item: any): string {
    return this.itemTitleFn(item);
  }

  isTreeExpanded(setup: any): boolean {
    return this.isTreeExpandedFn(setup);
  }

  isTreeLoading(setup: any): boolean {
    return this.isTreeLoadingFn(setup);
  }

  treeChildrenFor(setup: any): any[] {
    return this.treeChildrenForFn(setup);
  }
}
