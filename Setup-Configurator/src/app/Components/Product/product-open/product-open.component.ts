import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-product-open',
  imports: [CommonModule],
  template: `<div style="padding:24px;color:#fff;background:#0b1020;min-height:100vh;">Termek megnyitasa...</div>`
})
export class ProductOpenComponent implements OnInit {
  private readonly aiTypeToTable: Record<string, string> = {
    cpu_desktop: 'processors',
    gpu: 'video_cards',
    motherboard: 'motherboard',
    ram: 'ram',
    psu: 'psu',
    cpu_cooler: 'cpu_coolers',
    soundcard: 'soundcards',
    receiver: 'home_theater',
    audio_processor: 'audio_processors',
    portable_speaker: 'portable_speakers',
    front_speaker: 'front_speaker',
    back_speaker: 'back_speaker',
    side_speaker: 'side_speaker',
    center_speaker: 'center_speakers',
    floor_speaker: 'floor_speakers',
    ceiling_speaker: 'ceiling_speakers',
    subwoofer: 'subwoofer',
    bass_amplifier: 'bass_amplifier',
    bass_shaker: 'bass_shaker',
    studio_monitor: 'studio_monitor_speakers',
    acoustic_drums: 'acoustic_drums',
    acoustic_guitar: 'acoustic_guitars',
    trumpet: 'c_trumpets',
    saxophone: 'alt_saxophone',
    network_switch: 'switches',
    server_desktop: 'storages',
    soundbar: 'home_theater'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const name = String(this.route.snapshot.paramMap.get('name') || '').trim();
    if (!name) {
      this.router.navigate(['/home']);
      return;
    }

    this.http.get<any>('/api/products', {
      params: { q: name, limit: '12' },
      withCredentials: true
    }).subscribe({
      next: (response) => {
        const items = Array.isArray(response)
          ? response
          : (Array.isArray(response?.items) ? response.items : []);
        const target = this.pickBestMentionMatch(items, name);
        if (!target) {
          this.router.navigate(['/home']);
          return;
        }

        const table = this.resolveProductTable(target);
        const id = this.resolveProductId(target);
        if (!table || id === undefined || id === null) {
          this.router.navigate(['/home']);
          return;
        }

        this.router.navigate(['/product-site', table, id]);
      },
      error: () => {
        this.router.navigate(['/home']);
      }
    });
  }

  private resolveProductTable(product: any): string {
    const direct =
      product?.table_name ??
      product?.source_table ??
      product?.table ??
      product?.product_table ??
      product?.data?.table_name ??
      product?.data?.source_table ??
      product?.data?.table ??
      product?.data?.product_table;

    if (String(direct ?? '').trim()) {
      return String(direct).trim();
    }

    const type = String(
      product?.type ??
      product?.category ??
      product?.data?.type ??
      product?.data?.category ??
      ''
    ).trim().toLowerCase();

    return this.aiTypeToTable[type] || '';
  }

  private resolveProductId(product: any): number | string | null {
    const rawId =
      product?.id ??
      product?.product_id ??
      product?.products_id ??
      product?.data?.id ??
      product?.data?.product_id ??
      product?.data?.products_id;

    if (rawId === undefined || rawId === null || rawId === '') {
      return null;
    }

    return rawId;
  }

  private pickBestMentionMatch(items: any[], name: string): any | null {
    const normalizedTarget = this.normalizeMention(name);
    if (!items.length || !normalizedTarget) return null;

    const exact = items.find((item) => this.normalizeMention(item?.name || item?.model) === normalizedTarget);
    if (exact) return exact;

    const contains = items.find((item) => {
      const candidate = this.normalizeMention(item?.name || item?.model);
      return candidate.includes(normalizedTarget) || normalizedTarget.includes(candidate);
    });

    return contains || items[0] || null;
  }

  private normalizeMention(value: any): string {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
}
