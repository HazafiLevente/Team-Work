import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { HomeTheaterService } from '../../services/home-theater.service';

type LayoutType = '' | '2.1' | '5.1' | '7.1';

type RoleField = {
  key: string;
  label: string;
  catalogKeys: string[];
};

@Component({
  selector: 'app-home-theater-simple-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home-theater-simple-builder.component.html',
  styleUrls: ['./home-theater-simple-builder.component.css']
})
export class HomeTheaterSimpleBuilderComponent implements OnChanges {
  @Input() setup: any;
  @Output() saved = new EventEmitter<void>();

  loading = false;
  saving = false;
  error = '';
  success = '';

  buildId: number | null = null;
  layout: LayoutType = '';
  title = '';

  form: Record<string, any> = {};
  roleFields: RoleField[] = [];

  catalog: Record<string, any[]> = {
    receivers: [],
    frontSpeakers: [],
    centerSpeakers: [],
    sideSpeakers: [],
    backSpeakers: [],
    subwoofers: [],
    speakers: [],
    audioProcessors: [],
    bassAmplifiers: []
  };

  readonly layoutOptions: Array<{ value: Exclude<LayoutType, ''>; label: string }> = [
    { value: '2.1', label: '2.1' },
    { value: '5.1', label: '5.1' },
    { value: '7.1', label: '7.1' }
  ];

  private readonly htService = inject(HomeTheaterService);
  private readonly http = inject(HttpClient);

  ngOnChanges(): void {
    if (!this.setup) return;
    this.initializeBuilder();
  }

  private initializeBuilder(): void {
    this.loading = true;
    this.error = '';
    this.success = '';
    this.buildId = null;
    this.layout = '';
    this.title = this.setupTitle();
    this.form = {};
    this.roleFields = [];

    this.loadCatalog();
    this.loadExistingBuild();
  }

  private setupId(): number | null {
    const raw = this.setup?.id ?? this.setup?.setup_id ?? this.setup?.setupId ?? null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  setupTitle(): string {
    return String(
      this.setup?.setup_name ??
      this.setup?.display_name ??
      this.setup?.name ??
      'Névtelen setup'
    );
  }

  onLayoutChange(): void {
    this.success = '';
    this.ensureFormShape(true);
  }

  save(): void {
    const setupId = this.setupId();
    if (!setupId) {
      this.error = 'Hiányzik a setup azonosító.';
      return;
    }

    if (!this.layout) {
      this.error = 'Válassz layoutot.';
      return;
    }

    this.saving = true;
    this.error = '';
    this.success = '';

    const devices = this.cleanDevicesPayload();
    const payload = {
      id: this.buildId,
      setup_id: setupId,
      title: String(this.title || `${this.setupTitle()} ${this.layout}`).trim(),
      layout: this.layout,
      devices
    };

    this.htService.saveBuild(payload).subscribe({
      next: (res) => {
        this.saving = false;
        this.buildId = this.asNumber(res?.id) ?? this.buildId;
        this.success = 'Házimozi setup sikeresen mentve.';
        this.saved.emit();
      },
      error: (err) => {
        console.error('HT simple builder save error:', err);
        this.saving = false;
        this.error = 'Nem sikerült elmenteni a házimozi setupot.';
      }
    });
  }

  productOptions(field: RoleField): any[] {
    const merged = field.catalogKeys.flatMap((key) => Array.isArray(this.catalog[key]) ? this.catalog[key] : []);
    const seen = new Set<number>();
    return merged.filter((item) => {
      const id = this.asNumber(item?.id ?? item?.ID);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  productLabel(product: any): string {
    return [product?.manufacturer, product?.model].filter(Boolean).join(' ').trim() || `Eszköz #${product?.id ?? '?'}`;
  }

  private loadCatalog(): void {
    this.htService.getCatalog().subscribe({
      next: (catalog) => {
        this.catalog = this.normalizeCatalog(catalog);
      },
      error: (err) => {
        console.error('HT simple catalog error:', err);
      }
    });
  }

  private loadExistingBuild(): void {
    const setupId = this.setupId();
    if (!setupId) {
      this.loading = false;
      this.error = 'Hiányzik a setup azonosító.';
      return;
    }

    this.htService.getBuildsForSetup(setupId).subscribe({
      next: (res: any) => {
        const builds = Array.isArray(res) ? res : Array.isArray(res?.builds) ? res.builds : [];
        const existing = builds[0];

        if (!existing?.id) {
          this.loadExistingDevicesFallback(setupId);
          return;
        }

        this.htService.getBuildById(existing.id).subscribe({
          next: (build) => {
            this.applyExistingBuild(build);
            this.loading = false;
          },
          error: (err) => {
            console.error('HT simple build load error:', err);
            this.loadExistingDevicesFallback(setupId);
          }
        });
      },
      error: (err) => {
        console.error('HT simple builds load error:', err);
        this.loadExistingDevicesFallback(setupId);
      }
    });
  }

  private loadExistingDevicesFallback(setupId: number): void {
    this.http.get<any[]>(`/api/home-theater/${setupId}/devices`, { withCredentials: true }).subscribe({
      next: (devices) => {
        const mapped = this.mapDevicesListToForm(Array.isArray(devices) ? devices : []);
        this.layout = this.inferLayout(mapped);
        this.ensureFormShape(false);
        this.patchForm(mapped);
        this.loading = false;
      },
      error: (err) => {
        console.error('HT simple device fallback error:', err);
        this.layout = '5.1';
        this.ensureFormShape(false);
        this.loading = false;
      }
    });
  }

  private applyExistingBuild(build: any): void {
    this.buildId = this.asNumber(build?.id);
    this.title = String(build?.title ?? build?.setup_name ?? this.setupTitle()).trim();

    const existingDevices = this.extractDevicesMap(
      build?.devices ??
      build?.device_map ??
      build?.deviceMap ??
      null
    );

    this.layout = this.extractLayout(build?.layout, existingDevices);
    this.ensureFormShape(false);
    this.patchForm(existingDevices);
  }

  private normalizeCatalog(source: any): Record<string, any[]> {
    const result: Record<string, any[]> = {
      receivers: [],
      frontSpeakers: [],
      centerSpeakers: [],
      sideSpeakers: [],
      backSpeakers: [],
      subwoofers: [],
      speakers: [],
      audioProcessors: [],
      bassAmplifiers: []
    };

    const aliasMap: Record<string, keyof typeof result> = {
      receiver: 'receivers',
      receivers: 'receivers',
      reciever: 'receivers',
      recievers: 'receivers',
      front_speaker: 'frontSpeakers',
      front_speakers: 'frontSpeakers',
      frontspeakers: 'frontSpeakers',
      center_speaker: 'centerSpeakers',
      centerspeaker: 'centerSpeakers',
      center_speakers: 'centerSpeakers',
      centerspeakers: 'centerSpeakers',
      side_speaker: 'sideSpeakers',
      sidespeaker: 'sideSpeakers',
      side_speakers: 'sideSpeakers',
      sidespeakers: 'sideSpeakers',
      back_speaker: 'backSpeakers',
      backspeaker: 'backSpeakers',
      back_speakers: 'backSpeakers',
      backspeakers: 'backSpeakers',
      subwoofer: 'subwoofers',
      subwoofers: 'subwoofers',
      speaker: 'speakers',
      speakers: 'speakers',
      audio_processor: 'audioProcessors',
      audioprocessor: 'audioProcessors',
      audio_processors: 'audioProcessors',
      bass_amplifier: 'bassAmplifiers',
      bassamplifier: 'bassAmplifiers',
      bass_amplifiers: 'bassAmplifiers',
      frontSpeakers: 'frontSpeakers',
      backSpeakers: 'backSpeakers',
      centerSpeakers: 'centerSpeakers',
      sideSpeakers: 'sideSpeakers',
      subwoofersRaw: 'subwoofers',
      audioProcessorsRaw: 'audioProcessors',
      bassAmplifiersRaw: 'bassAmplifiers'
    };

    Object.entries(source || {}).forEach(([rawKey, value]) => {
      const list = (Array.isArray(value) ? value : []).map((item) => {
        if (!item || typeof item !== 'object') return item;
        const id = item['id'] ?? item['ID'] ?? item['Id'] ?? item['product_id'] ?? item['device_ref_id'] ?? null;
        // Ensure consistent `id` key for templates + tracking.
        return id != null ? { ...item, id } : item;
      });
      const normalizedKey = rawKey.replace(/[^a-zA-Z]/g, '');
      const targetKey =
        aliasMap[rawKey] ??
        aliasMap[rawKey.toLowerCase()] ??
        aliasMap[normalizedKey] ??
        aliasMap[normalizedKey.toLowerCase()];

      if (!targetKey) return;
      result[targetKey] = list;
    });

    return result;
  }

  private ensureFormShape(preserveValues: boolean): void {
    const previous = preserveValues ? { ...this.form } : {};
    const next: Record<string, any> = {
      receiver: previous['receiver'] ?? '',
      bass_amplifier: previous['bass_amplifier'] ?? ''
    };

    this.roleFields = this.roleFieldsForLayout(this.layout);
    this.roleFields.forEach((field) => {
      next[field.key] = previous[field.key] ?? '';
    });

    this.form = next;
  }

  private roleFieldsForLayout(layout: LayoutType): RoleField[] {
    if (layout === '2.1') {
      return [
        { key: 'front_left', label: 'Front Left', catalogKeys: ['frontSpeakers', 'speakers'] },
        { key: 'front_right', label: 'Front Right', catalogKeys: ['frontSpeakers', 'speakers'] },
        { key: 'subwoofer', label: 'Subwoofer', catalogKeys: ['subwoofers'] }
      ];
    }

    if (layout === '7.1') {
      return [
        { key: 'front_left', label: 'Front Left', catalogKeys: ['frontSpeakers', 'speakers'] },
        { key: 'front_right', label: 'Front Right', catalogKeys: ['frontSpeakers', 'speakers'] },
        { key: 'center', label: 'Center', catalogKeys: ['centerSpeakers', 'speakers'] },
        { key: 'side_left', label: 'Side Left', catalogKeys: ['sideSpeakers', 'speakers'] },
        { key: 'side_right', label: 'Side Right', catalogKeys: ['sideSpeakers', 'speakers'] },
        { key: 'back_left', label: 'Back Left', catalogKeys: ['backSpeakers', 'speakers'] },
        { key: 'back_right', label: 'Back Right', catalogKeys: ['backSpeakers', 'speakers'] },
        { key: 'subwoofer', label: 'Subwoofer', catalogKeys: ['subwoofers'] }
      ];
    }

    if (layout === '5.1') {
      return [
        { key: 'front_left', label: 'Front Left', catalogKeys: ['frontSpeakers', 'speakers'] },
        { key: 'front_right', label: 'Front Right', catalogKeys: ['frontSpeakers', 'speakers'] },
        { key: 'center', label: 'Center', catalogKeys: ['centerSpeakers', 'speakers'] },
        { key: 'back_left', label: 'Back Left', catalogKeys: ['backSpeakers', 'sideSpeakers', 'speakers'] },
        { key: 'back_right', label: 'Back Right', catalogKeys: ['backSpeakers', 'sideSpeakers', 'speakers'] },
        { key: 'subwoofer', label: 'Subwoofer', catalogKeys: ['subwoofers'] }
      ];
    }

    return [];
  }

  private extractLayout(rawLayout: any, existingDevices: Record<string, any>): LayoutType {
    const normalized = String(rawLayout ?? '').trim();
    if (normalized === '2.1' || normalized === '5.1' || normalized === '7.1') {
      return normalized;
    }

    return this.inferLayout(existingDevices);
  }

  private inferLayout(existingDevices: Record<string, any>): LayoutType {
    if (existingDevices['side_left'] || existingDevices['side_right']) return '7.1';
    if (
      existingDevices['center'] ||
      existingDevices['back_left'] ||
      existingDevices['back_right']
    ) {
      return '5.1';
    }
    return '2.1';
  }

  private extractDevicesMap(source: any): Record<string, any> {
    const parsed = this.parseMaybeJson(source);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const normalized: Record<string, any> = {};

    Object.entries(parsed).forEach(([rawKey, rawValue]) => {
      const key = this.normalizeDeviceKey(rawKey);
      const value = this.asNumber(rawValue);
      if (key && value) {
        normalized[key] = value;
      }
    });

    return normalized;
  }

  private mapDevicesListToForm(devices: any[]): Record<string, any> {
    const next: Record<string, any> = {};
    const counters: Record<string, number> = {};

    devices.forEach((device) => {
      const targetKey = this.deviceRoleToField(device?.role ?? device?.type ?? device?.category ?? device?.product_category);
      const productId = this.asNumber(
        device?.device_ref_id ??
        device?.product_id ??
        device?.ref_id ??
        device?.source_id ??
        device?.productId ??
        null
      );

      if (!targetKey || !productId) return;

      if (targetKey === 'front_pair') {
        const count = counters[targetKey] ?? 0;
        next[count === 0 ? 'front_left' : 'front_right'] = productId;
        counters[targetKey] = count + 1;
        return;
      }

      if (targetKey === 'back_pair') {
        const count = counters[targetKey] ?? 0;
        next[count === 0 ? 'back_left' : 'back_right'] = productId;
        counters[targetKey] = count + 1;
        return;
      }

      if (targetKey === 'side_pair') {
        const count = counters[targetKey] ?? 0;
        next[count === 0 ? 'side_left' : 'side_right'] = productId;
        counters[targetKey] = count + 1;
        return;
      }

      next[targetKey] = productId;
    });

    return next;
  }

  private patchForm(values: Record<string, any>): void {
    this.form = {
      ...this.form,
      ...values
    };
  }

  private cleanDevicesPayload(): Record<string, number> {
    return Object.entries(this.form).reduce((acc, [key, value]) => {
      const parsed = this.asNumber(value);
      if (parsed) {
        acc[key] = parsed;
      }
      return acc;
    }, {} as Record<string, number>);
  }

  private normalizeDeviceKey(value: any): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
  }

  private deviceRoleToField(rawRole: any): string | null {
    const role = this.normalizeDeviceKey(rawRole);
    const map: Record<string, string> = {
      receiver: 'receiver',
      reciever: 'receiver',
      receivers: 'receiver',
      recievers: 'receiver',
      av_receiver: 'receiver',
      avr: 'receiver',
      bass_amplifier: 'bass_amplifier',
      bassamplifier: 'bass_amplifier',
      front_speaker: 'front_pair',
      frontspeakers: 'front_pair',
      front_speakers: 'front_pair',
      front_left: 'front_left',
      front_right: 'front_right',
      center: 'center',
      centerspeaker: 'center',
      center_speaker: 'center',
      center_speakers: 'center',
      centerspeakers: 'center',
      back_speaker: 'back_pair',
      backspeaker: 'back_pair',
      back_speakers: 'back_pair',
      backspeakers: 'back_pair',
      back_left: 'back_left',
      back_right: 'back_right',
      side_speaker: 'side_pair',
      sidespeaker: 'side_pair',
      side_speakers: 'side_pair',
      sidespeakers: 'side_pair',
      surround_left: 'side_left',
      surround_right: 'side_right',
      side_left: 'side_left',
      side_right: 'side_right',
      subwoofer: 'subwoofer',
      subwoofers: 'subwoofer'
    };

    return map[role] ?? null;
  }

  private parseMaybeJson(value: any): any {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (
      !(trimmed.startsWith('{') && trimmed.endsWith('}')) &&
      !(trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      return value;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  private asNumber(value: any): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
}
