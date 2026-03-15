import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-setup-ht-details-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './setup-ht-details-panel.component.html',
  styleUrls: ['./setup-ht-details-panel.component.css']
})
export class SetupHtDetailsPanelComponent implements OnChanges {
  @Input() htItem: any;
  @Output() close = new EventEmitter<void>();
  @ViewChild('panelEl', { static: false }) panelEl?: ElementRef<HTMLElement>;

  loading = false;
  error = '';

  panelX = 24;
  panelY = 110;
  dragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  private devicesList: any[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['htItem'] && this.htItem) {
      this.normalizeDevices();
    }
  }

  title(): string {
    return (
      this.htItem?.title ??
      this.htItem?.setup_name ??
      this.htItem?.display_name ??
      this.htItem?.name ??
      'Home Theater'
    );
  }

  subtitle(): string {
    return 'Home theater details';
  }

  private normalizeText(value: any): string {
    if (value == null) return '';
    return String(value).trim().toLowerCase();
  }

  private tryParseJson(value: any): any {
    if (typeof value !== 'string') return value;

    const trimmed = value.trim();
    if (
      !(trimmed.startsWith('[') && trimmed.endsWith(']')) &&
      !(trimmed.startsWith('{') && trimmed.endsWith('}'))
    ) {
      return value;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  private normalizeDevices(): void {
    this.loading = false;
    this.error = '';
    this.devicesList = [];

    const parsedDevices = this.tryParseJson(
      this.htItem?.devices ??
      this.htItem?.device_map ??
      this.htItem?.deviceMap ??
      null
    );

    const parsedLayout = this.tryParseJson(this.htItem?.layout ?? null);

    if (Array.isArray(parsedDevices)) {
      this.devicesList = parsedDevices;
      return;
    }

    if (Array.isArray(parsedLayout)) {
      this.devicesList = parsedLayout;
      return;
    }

    if (parsedDevices && typeof parsedDevices === 'object') {
      this.devicesList = Object.values(parsedDevices);
      return;
    }

    if (parsedLayout && typeof parsedLayout === 'object' && !Array.isArray(parsedLayout)) {
      this.devicesList = Object.values(parsedLayout);
      return;
    }

    this.devicesList = [];
  }

  private cleanDeviceName(device: any): string {
    if (!device) return 'Not selected';

    const manufacturer = String(device?.manufacturer ?? '').trim();
    const name = String(device?.name ?? '').trim();
    const model = String(device?.model ?? '').trim();

    const pretty = [manufacturer, name || model].filter(Boolean).join(' ').trim();
    return pretty || 'Not selected';
  }

  private roleOf(device: any): string {
    return this.normalizeText(
      device?.role ??
      device?.type ??
      device?.category ??
      ''
    );
  }

  private devicesByRoles(...roles: string[]): any[] {
    const wanted = roles.map(r => this.normalizeText(r));

    return this.devicesList.filter((device: any) => {
      const role = this.roleOf(device);
      return wanted.includes(role);
    });
  }

  private firstDeviceName(...roles: string[]): string {
    const list = this.devicesByRoles(...roles);
    return this.cleanDeviceName(list[0] ?? null);
  }

  private nthDeviceName(index: number, ...roles: string[]): string {
    const list = this.devicesByRoles(...roles);
    return this.cleanDeviceName(list[index] ?? null);
  }

  layoutValue(): string {
    const rawLayout = this.htItem?.layout;

    if (typeof rawLayout === 'string') {
      const trimmed = rawLayout.trim();

      if (
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))
      ) {
        return this.inferLayout();
      }

      if (trimmed) return trimmed;
    }

    return this.inferLayout();
  }

  private inferLayout(): string {
    const hasCenter = this.devicesByRoles('center', 'centerspeaker', 'center_speaker', 'centerspeakers').length > 0;
    const surroundCount = this.devicesByRoles(
      'surround_left',
      'surround_right',
      'side_left',
      'side_right',
      'sidespeakers',
      'side_speakers'
    ).length;
    const backCount = this.devicesByRoles(
      'back_left',
      'back_right',
      'backspeakers',
      'back_speakers'
    ).length;
    const subCount = this.devicesByRoles('subwoofer', 'subwoofers').length > 0 ? 1 : 0;

    const mainChannels =
      2 +
      (hasCenter ? 1 : 0) +
      Math.min(surroundCount, 2) +
      Math.min(backCount, 2);

    return `${mainChannels}.${subCount}`;
  }

  receiverName(): string {
    return this.firstDeviceName('receiver', 'receivers', 'av_receiver', 'avr');
  }

  frontLeftName(): string {
    return this.nthDeviceName(0, 'front_left', 'frontspeakers', 'front_speakers');
  }

  frontRightName(): string {
    return this.nthDeviceName(1, 'front_right', 'frontspeakers', 'front_speakers');
  }

  centerName(): string {
    return this.firstDeviceName('center', 'centerspeaker', 'center_speaker', 'centerspeakers');
  }

  surroundLeftName(): string {
    return this.nthDeviceName(0, 'surround_left', 'side_left', 'sidespeakers', 'side_speakers');
  }

  surroundRightName(): string {
    return this.nthDeviceName(1, 'surround_right', 'side_right', 'sidespeakers', 'side_speakers');
  }

  backLeftName(): string {
    return this.nthDeviceName(0, 'back_left', 'backspeakers', 'back_speakers');
  }

  backRightName(): string {
    return this.nthDeviceName(1, 'back_right', 'backspeakers', 'back_speakers');
  }

  subwooferName(): string {
    return this.firstDeviceName('subwoofer', 'subwoofers');
  }

  visibleRows(): Array<{ label: string; value: string }> {
    const rows: Array<{ label: string; value: string }> = [
      { label: 'Layout', value: this.layoutValue() },
      { label: 'Receiver', value: this.receiverName() },
      { label: 'Front Left', value: this.frontLeftName() },
      { label: 'Front Right', value: this.frontRightName() }
    ];

    const center = this.centerName();
    const surroundLeft = this.surroundLeftName();
    const surroundRight = this.surroundRightName();
    const backLeft = this.backLeftName();
    const backRight = this.backRightName();
    const sub = this.subwooferName();

    if (center !== 'Not selected') {
      rows.push({ label: 'Center', value: center });
    }

    if (surroundLeft !== 'Not selected') {
      rows.push({ label: 'Surround Left', value: surroundLeft });
    }

    if (surroundRight !== 'Not selected') {
      rows.push({ label: 'Surround Right', value: surroundRight });
    }

    if (backLeft !== 'Not selected') {
      rows.push({ label: 'Back Left', value: backLeft });
    }

    if (backRight !== 'Not selected') {
      rows.push({ label: 'Back Right', value: backRight });
    }

    rows.push({ label: 'Subwoofer', value: sub });

    return rows;
  }

  stop(e: MouseEvent): void {
    e.stopPropagation();
  }

  startDrag(event: MouseEvent): void {
    const boundary = document.querySelector('.setup-workspace .boundary-area') as HTMLElement | null;
    const boundaryRect = boundary?.getBoundingClientRect();

    if (boundaryRect) {
      const localMouseX = event.clientX - boundaryRect.left;
      const localMouseY = event.clientY - boundaryRect.top;

      this.dragOffsetX = localMouseX - this.panelX;
      this.dragOffsetY = localMouseY - this.panelY;
    } else {
      this.dragOffsetX = event.clientX - this.panelX;
      this.dragOffsetY = event.clientY - this.panelY;
    }

    this.dragging = true;
    event.preventDefault();
  }

  onDrag(event: MouseEvent): void {
    if (!this.dragging) return;

    const boundary = document.querySelector('.setup-workspace .boundary-area') as HTMLElement | null;
    const boundaryRect = boundary?.getBoundingClientRect();
    const panelRect = this.panelEl?.nativeElement.getBoundingClientRect();

    if (!boundaryRect) {
      const nextX = event.clientX - this.dragOffsetX;
      const nextY = event.clientY - this.dragOffsetY;

      this.panelX = Math.max(0, nextX);
      this.panelY = Math.max(0, nextY);
      return;
    }

    const panelWidth = panelRect?.width ?? 360;
    const panelHeight = panelRect?.height ?? 520;

    const localMouseX = event.clientX - boundaryRect.left;
    const localMouseY = event.clientY - boundaryRect.top;

    const nextX = localMouseX - this.dragOffsetX;
    const nextY = localMouseY - this.dragOffsetY;

    const maxX = Math.max(0, boundaryRect.width - panelWidth - 8);
    const maxY = Math.max(0, boundaryRect.height - panelHeight - 8);

    this.panelX = Math.min(Math.max(0, nextX), maxX);
    this.panelY = Math.min(Math.max(0, nextY), maxY);
  }

  stopDrag(): void {
    this.dragging = false;
  }
}
