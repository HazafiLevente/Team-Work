import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, switchMap } from 'rxjs';

export interface SetupTarget {
  id: number;
  name: string;
  isFavorite: boolean;
  isNote: boolean;
}

export interface SetupDevicePayload {
  product_id: number;
  source_table: string;
  display_name: string;
  manufacturer: string;
}

export interface NoteDevice {
  id: number;
  name: string;
  manufacturer: string;
  category: string;
  tableName: string;
  price: string | number | null;
}

@Injectable({ providedIn: 'root' })
export class SetupNoteService {
  constructor(private http: HttpClient) {}

  loadTargets(): Observable<SetupTarget[]> {
    return forkJoin({
      regular: this.http.get<any>('/api/setup?favorite=false', { withCredentials: true }),
      favorite: this.http.get<any>('/api/setup?favorite=true', { withCredentials: true })
    }).pipe(
      map(({ regular, favorite }) => [
        ...this.normalizeTargets(regular, false),
        ...this.normalizeTargets(favorite, true)
      ]),
      map((targets) => this.sortTargets(targets))
    );
  }

  loadNotes(): Observable<SetupTarget[]> {
    return this.loadTargets().pipe(
      map((targets) => targets.filter((target) => target.isNote))
    );
  }

  loadNoteDevices(noteId: number): Observable<NoteDevice[]> {
    return this.http.get<any>(`/api/setup/${noteId}/get-children`, { withCredentials: true }).pipe(
      map((response) => {
        const items = Array.isArray(response)
          ? response
          : (Array.isArray(response?.items) ? response.items : []);

        return items.map((item: any) => this.normalizeDevice(item));
      })
    );
  }

  addProductToTarget(targetId: number, payload: SetupDevicePayload): Observable<any> {
    return this.http.post<any>(`/api/setup/${targetId}/save-device`, payload, { withCredentials: true });
  }

  removeNoteDevice(device: NoteDevice): Observable<any> {
    return this.http.request('delete', '/api/setup/remove-item', {
      body: {
        itemId: device.id,
        tableName: device.tableName || 'setups'
      },
      withCredentials: true
    });
  }

  removeNote(noteId: number): Observable<any> {
    return this.http.delete<any>(`/api/setup/remove-setup/${noteId}`, { withCredentials: true });
  }

  createNote(name: string): Observable<SetupTarget> {
    return this.http.post<any>('/api/setup/save-setup', {
      setup_name: name,
      isFavorite: false,
      isNote: true,
      x: 50,
      y: 50
    }, { withCredentials: true }).pipe(
      map((response) => this.normalizeCreatedNote(response, name))
    );
  }

  createNoteAndAddProduct(name: string, payload: SetupDevicePayload): Observable<SetupTarget> {
    return this.createNote(name).pipe(
      switchMap((note) => this.addProductToTarget(note.id, payload).pipe(map(() => note)))
    );
  }

  addProductToPrimaryNote(payload: SetupDevicePayload, defaultName = 'Jegyzet'): Observable<SetupTarget> {
    return this.loadTargets().pipe(
      switchMap((targets) => {
        const note = targets.find((target) => target.isNote);

        if (note) {
          return this.addProductToTarget(note.id, payload).pipe(map(() => note));
        }

        return this.createNoteAndAddProduct(defaultName, payload);
      })
    );
  }

  buildDevicePayload(product: any): SetupDevicePayload | null {
    const table = this.getTable(product);
    const id = this.getId(product);

    if (!table || !Number.isFinite(id) || id <= 0) {
      return null;
    }

    return {
      product_id: id,
      source_table: table,
      display_name: this.getDisplayName(product),
      manufacturer: this.getManufacturer(product)
    };
  }

  private normalizeTargets(response: any, isFavorite: boolean): SetupTarget[] {
    const items = Array.isArray(response)
      ? response
      : (Array.isArray(response?.setups) ? response.setups : []);

    return items
      .map((item: any) => ({
        id: Number(item?.id ?? item?.setup_id ?? 0),
        name: String(item?.setup_name ?? item?.name ?? 'Setup').trim() || 'Setup',
        isFavorite,
        isNote: this.toBoolean(item?.isNote ?? item?.is_note ?? item?.isnote)
      }))
      .filter((item: SetupTarget) => Number.isFinite(item.id) && item.id > 0);
  }

  private normalizeDevice(item: any): NoteDevice {
    return {
      id: Number(item?.id ?? item?.device_id ?? item?.product_id ?? 0),
      name: String(item?.display_name ?? item?.name ?? item?.model ?? item?.setup_name ?? 'Eszkoz').trim() || 'Eszkoz',
      manufacturer: String(item?.manufacturer ?? item?.Manufacturer ?? '').trim(),
      category: String(item?.category ?? item?.source_table ?? item?.table_name ?? item?.type ?? 'setup_devices').trim(),
      tableName: String(item?.category ?? 'setups').trim() || 'setups',
      price: item?.price
        ?? item?.Price
        ?? item?.price_huf
        ?? item?.['Price Range (Ft)']
        ?? item?.data?.price
        ?? item?.data?.Price
        ?? item?.data?.price_huf
        ?? item?.data?.['Price Range (Ft)']
        ?? null
    };
  }

  private sortTargets(targets: SetupTarget[]): SetupTarget[] {
    const preferredOrder = ['mysetup', 'favorite4'];

    return [...targets].sort((a, b) => {
      const ai = preferredOrder.indexOf(a.name.toLowerCase());
      const bi = preferredOrder.indexOf(b.name.toLowerCase());
      const aRank = ai === -1 ? 999 : ai;
      const bRank = bi === -1 ? 999 : bi;
      if (aRank !== bRank) return aRank - bRank;
      if (a.isFavorite !== b.isFavorite) return Number(a.isFavorite) - Number(b.isFavorite);
      return a.name.localeCompare(b.name, 'hu');
    });
  }

  private normalizeCreatedNote(response: any, fallbackName: string): SetupTarget {
    const setup = response?.setup;
    const id = Number(setup?.id ?? setup?.setup_id);

    if (!Number.isFinite(id) || id <= 0) {
      throw new Error('A jegyzet letrejott, de hianyzik az azonositoja.');
    }

    return {
      id,
      name: String(setup?.setup_name ?? setup?.name ?? fallbackName).trim() || fallbackName,
      isFavorite: this.toBoolean(setup?.isFavorite ?? setup?.is_favorite),
      isNote: true
    };
  }

  private getSource(product: any): any {
    return product?.data ?? product ?? {};
  }

  private getTable(product: any): string {
    const source = this.getSource(product);
    return String(product?.table_name ?? product?.table ?? source?.table_name ?? source?.table ?? '').trim();
  }

  private getId(product: any): number {
    const source = this.getSource(product);
    return Number(product?.id ?? product?.ID ?? source?.id ?? source?.ID ?? 0);
  }

  private getDisplayName(product: any): string {
    const source = this.getSource(product);
    const name = product?.name ?? product?.model ?? source?.name ?? source?.Name ?? source?.model ?? source?.Model;
    return String(name ?? 'Eszkoz').trim() || 'Eszkoz';
  }

  private getManufacturer(product: any): string {
    const source = this.getSource(product);
    const manufacturer = product?.manufacturer ?? source?.manufacturer ?? source?.Manufacturer;
    return String(manufacturer ?? '').trim();
  }

  private toBoolean(value: any): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  }
}
