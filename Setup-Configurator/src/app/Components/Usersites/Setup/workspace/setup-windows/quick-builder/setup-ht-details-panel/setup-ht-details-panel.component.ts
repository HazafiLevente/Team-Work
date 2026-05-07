import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-setup-ht-details-panel',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
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
  private readonly http = inject(HttpClient);

  private devicesList: any[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['htItem'] && this.htItem) {
      this.loadDevices();
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

  private getSetupId(): number | null {
    const raw = this.htItem?.id ?? this.htItem?.setupId ?? this.htItem?.setup_id ?? null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private normalizeDevices(fallback?: any): void {
    this.loading = false;
    this.error = '';
    this.devicesList = [];

    const parsedDevices = this.tryParseJson(
      fallback ??
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

  private loadDevices(): void {
    const setupId = this.getSetupId();
    if (!setupId) {
      this.normalizeDevices();
      return;
    }

    this.loading = true;
    this.error = '';

    this.http.get<any[]>(`/api/home-theater/${setupId}/devices`, {
      withCredentials: true
    }).subscribe({
      next: (rows) => {
        this.loading = false;

        if (Array.isArray(rows) && rows.length > 0) {
          this.devicesList = rows;
          return;
        }

        this.normalizeDevices();
      },
      error: () => {
        this.loading = false;
        this.normalizeDevices();
      }
    });
  }

  private cleanDeviceName(device: any): string {
    if (!device) return 'Not selected';

    const manufacturer = String(device?.manufacturer ?? '').trim();
    const name = String(device?.name ?? '').trim();
    const model = String(device?.model ?? '').trim();
    const fieldModel = String(device?.fields?.model ?? '').trim();
    const fieldManufacturer = String(device?.fields?.manufacturer ?? '').trim();

    const pretty = [manufacturer || fieldManufacturer, name || model || fieldModel].filter(Boolean).join(' ').trim();
    return pretty || 'Not selected';
  }

  private roleOf(device: any): string {
    return this.normalizeText(
      device?.product_category ??
      device?.category ??
      device?.fields?.category ??
      device?.role ??
      device?.type ??
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

  bassAmplifierName(): string {
    return this.firstDeviceName('bass_amplifier', 'bassamplifier', 'bass_amplifier_setup');
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

  private roleLabel(role: string): string {
    const normalized = this.normalizeText(role);

    const labels: Record<string, string> = {
      receiver: 'Receiver',
      reciever: 'reciever',
      recievers: 'reciever',
      av_receiver: 'reciever',
      avr: 'reciever',
      audio_processor: 'audio_processor',
      bass_amplifier: 'Bass Amplifier',
      front_speaker: 'front_speaker',
      front_left: 'Front Left',
      front_right: 'Front Right',
      center_speaker: 'center_speaker',
      center: 'Center',
      side_speaker: 'side_speaker',
      surround_left: 'Surround Left',
      surround_right: 'Surround Right',
      back_speaker: 'back_speaker',
      back_left: 'Back Left',
      back_right: 'Back Right',
      side_left: 'Side Left',
      side_right: 'Side Right',
      subwoofer: 'Subwoofer',
      speaker: 'speaker',
      htdevices: 'speaker'
    };

    return labels[normalized] ?? role;
  }

  private roleOrder(role: string): number {
    const normalized = this.normalizeText(role);
    const order: Record<string, number> = {
      receiver: 10,
      reciever: 10,
      audio_processor: 20,
      bass_amplifier: 25,
      front_speaker: 30,
      front_left: 31,
      front_right: 32,
      center_speaker: 40,
      center: 41,
      side_speaker: 50,
      surround_left: 51,
      surround_right: 52,
      back_speaker: 60,
      back_left: 61,
      back_right: 62,
      subwoofer: 70,
      speaker: 80,
      htdevices: 80
    };

    return order[normalized] ?? 999;
  }

  visibleRows(): Array<{ label: string; value: string }> {
    return this.devicesList
      .map((device: any) => ({
        role: this.roleOf(device),
        label: this.roleLabel(this.roleOf(device)),
        value: this.cleanDeviceName(device)
      }))
      .filter((row) => row.role && row.value !== 'Not selected')
      .sort((a, b) => this.roleOrder(a.role) - this.roleOrder(b.role))
      .map(({ label, value }) => ({ label, value }));
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
