import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-setup-connections',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './setup-connections.component.html',
  styleUrls: ['./setup-connections.component.css']
})
export class SetupConnectionsComponent {
  @Input() connections: any[] = [];
  @Input() globalRoomConnections: any[] = [];
  @Input() lineRefreshTrigger = 0;
  @Input() elementRegistry!: Map<string, HTMLElement>;
  @Input() boundaryEl!: HTMLElement | null;
  @Input() connectMousePos = { x: 0, y: 0 };
  @Input() connectSourceSetup: any = null;
  @Input() pairingStage: 'NONE' | 'PICK_SOURCE' | 'PICK_TARGET_SETUP' | 'PICK_TARGET_ITEM' = 'NONE';
  @Input() viewingSetup: any = null;



  private normalizeCategory(cat: any): string {
    return String(cat || '')
      .toLowerCase()
      .replace('[setup]', '')
      .trim();
  }

  getLinePath(conn: any, _trigger?: any): string {
    if (!this.boundaryEl || !this.elementRegistry) return '';

    const sCat = this.normalizeCategory(conn?.source?.category);
    const tCat = this.normalizeCategory(conn?.target?.category);

    const sId = `${sCat}:${conn?.source?.id}`;
    const tId = `${tCat}:${conn?.target?.id}`;

    let sEl = this.elementRegistry?.get(sId);
    let tEl = this.elementRegistry?.get(tId);


    if (!sEl && tEl) {
      const tmp = sEl;
      sEl = tEl;
      tEl = tmp;
    }

    if (!sEl) return '';

    const rect = this.boundaryEl.getBoundingClientRect();
    const sRect = sEl.getBoundingClientRect();

    const x1 = sRect.left + sRect.width / 2 - rect.left;
    const y1 = sRect.top + sRect.height / 2 - rect.top;

    if (!tEl) {
      const x2 = rect.width - 20;
      const y2 = y1;
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }

    const tRect = tEl.getBoundingClientRect();
    const x2 = tRect.left + tRect.width / 2 - rect.left;
    const y2 = tRect.top + tRect.height / 2 - rect.top;

    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  getLineLabelPosition(conn: any): { x: number; y: number } | null {
    if (!this.boundaryEl || !this.elementRegistry) return null;

    const sCat = this.normalizeCategory(conn?.source?.category);
    const tCat = this.normalizeCategory(conn?.target?.category);
    const sEl = this.elementRegistry?.get(`${sCat}:${conn?.source?.id}`);
    const tEl = this.elementRegistry?.get(`${tCat}:${conn?.target?.id}`);

    if (!sEl || !tEl) return null;

    const rect = this.boundaryEl.getBoundingClientRect();
    const sRect = sEl.getBoundingClientRect();
    const tRect = tEl.getBoundingClientRect();

    const x1 = sRect.left + sRect.width / 2 - rect.left;
    const y1 = sRect.top + sRect.height / 2 - rect.top;
    const x2 = tRect.left + tRect.width / 2 - rect.left;
    const y2 = tRect.top + tRect.height / 2 - rect.top;

    return {
      x: (x1 + x2) / 2,
      y: (y1 + y2) / 2 - 6
    };
  }

  getRoomLinePath(conn: any, _trigger?: any): string {
    if (!this.boundaryEl || !this.elementRegistry) return '';

    const sId = `room:${conn?.source?.id}`;
    const tId = `room:${conn?.target?.id}`;

    const sEl = this.elementRegistry.get(sId);
    const tEl = this.elementRegistry.get(tId);




    if (!sEl || !tEl) return '';

    const rect = this.boundaryEl.getBoundingClientRect();
    const sRect = sEl.getBoundingClientRect();
    const tRect = tEl.getBoundingClientRect();

    const x1 = sRect.left + sRect.width / 2 - rect.left;
    const y1 = sRect.top + sRect.height / 2 - rect.top;
    const x2 = tRect.left + tRect.width / 2 - rect.left;
    const y2 = tRect.top + tRect.height / 2 - rect.top;

    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  getGhostLinePath(): string {
    if (!this.boundaryEl || !this.connectSourceSetup || !this.elementRegistry || !this.connectMousePos) return '';

    const sid = 'room:' + (this.connectSourceSetup.id || this.connectSourceSetup.setup_id);
    const sourceEl = this.elementRegistry.get(sid);
    if (!sourceEl) return '';

    const rect = sourceEl.getBoundingClientRect();
    const parentRect = this.boundaryEl.getBoundingClientRect();

    const x1 = rect.left + rect.width / 2 - parentRect.left;
    const y1 = rect.top + rect.height / 2 - parentRect.top;
    const x2 = this.connectMousePos.x || 0;
    const y2 = this.connectMousePos.y || 0;

    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  private getCenter(el: HTMLElement) {

    const rect = el.getBoundingClientRect();
    const boundary = this.boundaryEl?.getBoundingClientRect();

    if (!boundary) {
      return { x: rect.left, y: rect.top };
    }

    return {
      x: rect.left - boundary.left + rect.width / 2,
      y: rect.top - boundary.top + rect.height / 2
    };
  }
}
