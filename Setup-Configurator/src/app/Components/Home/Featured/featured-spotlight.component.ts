import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CardSwapComponent } from '../../Shared/CardSwap/card-swap.component';
import { ImageService } from '../../Services/image/image.service';
import { NoteDevice, SetupNoteService, SetupTarget } from '../../Services/Setup/setup-note.service';



type AnyProduct = any;

@Component({
  selector: 'app-featured-spotlight',
  standalone: true,
  imports: [CommonModule, FormsModule, CardSwapComponent],

  templateUrl: './featured-spotlight.component.html',
  styleUrls: ['./featured-spotlight.component.css']

})
export class FeaturedSpotlightComponent implements OnChanges {
  @Input() products: AnyProduct[] = [];
  @Output() openProduct = new EventEmitter<AnyProduct>();
  images: string[] = [];
  cards: AnyProduct[] = [];
  notesOpen = false;
  notesLoading = false;
  noteDevicesLoading = false;
  noteError = '';
  noteDropActive = false;
  noteDropSaving = false;
  deletingNoteDeviceId: number | null = null;
  deletingNoteId: number | null = null;
  newNoteName = '';
  creatingNote = false;
  notes: SetupTarget[] = [];
  selectedNote: SetupTarget | null = null;
  noteDevices: NoteDevice[] = [];

  activeIndex = 0;

  constructor(
    private imagesSvc: ImageService,
    private setupNote: SetupNoteService
  ) {}


  get current(): AnyProduct | null {
    return this.cards?.[this.activeIndex] ?? null;
  }

  async ngOnChanges(ch: SimpleChanges) {
    if (ch['products']) {
      await this.imagesSvc.load();
      this.buildCards();
    }
  }


  onCardClick(idx: number) {
    const p = this.cards[idx];
    if (p) this.openProduct.emit(p);
  }


  onActiveChanged(idx: number) {
    this.activeIndex = idx;
  }

  openNotes() {
    this.notesOpen = true;
    this.loadNotes();
  }

  closeNotes() {
    this.notesOpen = false;
  }

  createNote() {
    const name = this.newNoteName.trim();

    if (!name || this.creatingNote) {
      return;
    }

    this.creatingNote = true;
    this.noteError = '';

    this.setupNote.createNote(name).subscribe({
      next: (note) => {
        this.creatingNote = false;
        this.newNoteName = '';
        this.notes = [note, ...this.notes.filter((item) => item.id !== note.id)];
        this.selectNote(note);
      },
      error: (err) => {
        this.creatingNote = false;
        this.noteError = err?.error?.error || 'Nem sikerult letrehozni a jegyzetet.';
      }
    });
  }

  selectNote(note: SetupTarget) {
    this.selectedNote = note;
    this.noteDevices = [];
    this.noteDevicesLoading = true;
    this.noteError = '';

    this.setupNote.loadNoteDevices(note.id).subscribe({
      next: (devices) => {
        this.noteDevices = devices;
        this.noteDevicesLoading = false;
      },
      error: (err) => {
        this.noteDevices = [];
        this.noteDevicesLoading = false;
        this.noteError = err?.error?.error || 'Nem sikerult betolteni a jegyzet eszkozeit.';
      }
    });
  }

  onNoteDragOver(event: DragEvent) {
    if (!this.selectedNote || this.noteDropSaving) return;

    event.preventDefault();
    this.noteDropActive = true;
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onNoteDragLeave(event: DragEvent) {
    const nextTarget = event.relatedTarget as Node | null;
    const currentTarget = event.currentTarget as Node | null;

    if (currentTarget && nextTarget && currentTarget.contains(nextTarget)) return;
    this.noteDropActive = false;
  }

  onNoteDrop(event: DragEvent) {
    event.preventDefault();
    this.noteDropActive = false;

    if (!this.selectedNote || this.noteDropSaving) return;

    const product = this.readDraggedProduct(event);
    const payload = this.setupNote.buildDevicePayload(product);

    if (!payload) {
      this.noteError = 'Nem sikerult beolvasni az athuzott termeket.';
      return;
    }

    this.noteDropSaving = true;
    this.noteError = '';

    this.setupNote.addProductToTarget(this.selectedNote.id, payload).subscribe({
      next: () => {
        this.noteDropSaving = false;
        this.selectNote(this.selectedNote as SetupTarget);
      },
      error: (err) => {
        this.noteDropSaving = false;
        this.noteError = err?.error?.error || 'Nem sikerult jegyzetbe rakni az eszkozt.';
      }
    });
  }

  formatDevicePrice(value: string | number | null): string {
    return this.formatPrice(value);
  }

  noteTotalPrice(): string {
    const total = this.noteDevices
      .map((device) => this.parsePrice(device.price))
      .filter((price): price is number => price !== null)
      .reduce((sum, price) => sum + price, 0);

    return total > 0 ? this.formatPrice(total) : '0 Ft';
  }

  removeDeviceFromNote(device: NoteDevice) {
    if (!this.selectedNote || this.deletingNoteDeviceId) return;

    this.deletingNoteDeviceId = device.id;
    this.noteError = '';

    this.setupNote.removeNoteDevice(device).subscribe({
      next: () => {
        this.deletingNoteDeviceId = null;
        this.selectNote(this.selectedNote as SetupTarget);
      },
      error: (err) => {
        this.deletingNoteDeviceId = null;
        this.noteError = err?.error?.error || 'Nem sikerult torolni az eszkozt a jegyzetbol.';
      }
    });
  }

  removeNote(note: SetupTarget, event: MouseEvent) {
    event.stopPropagation();

    if (this.deletingNoteId) return;

    this.deletingNoteId = note.id;
    this.noteError = '';

    this.setupNote.removeNote(note.id).subscribe({
      next: () => {
        this.deletingNoteId = null;
        this.notes = this.notes.filter((item) => item.id !== note.id);

        if (this.selectedNote?.id === note.id) {
          this.selectedNote = null;
          this.noteDevices = [];
        }

        if (this.notes.length) {
          this.selectNote(this.notes[0]);
        }
      },
      error: (err) => {
        this.deletingNoteId = null;
        this.noteError = err?.error?.error || 'Nem sikerult torolni a jegyzetet.';
      }
    });
  }

  private loadNotes() {
    this.notesLoading = true;
    this.noteError = '';

    this.setupNote.loadNotes().subscribe({
      next: (notes) => {
        this.notes = notes;
        this.notesLoading = false;

        if (!notes.length) {
          this.selectedNote = null;
          this.noteDevices = [];
          return;
        }

        const active = this.selectedNote
          ? notes.find((note) => note.id === this.selectedNote?.id)
          : null;

        this.selectNote(active ?? notes[0]);
      },
      error: (err) => {
        this.notes = [];
        this.selectedNote = null;
        this.noteDevices = [];
        this.notesLoading = false;
        this.noteError = err?.error?.error || 'Nem sikerult betolteni a jegyzeteket.';
      }
    });
  }

  private readDraggedProduct(event: DragEvent): any {
    const raw = event.dataTransfer?.getData('application/json')
      || event.dataTransfer?.getData('text/plain')
      || '';

    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  get totalProducts(): number {
    return this.products?.length ?? 0;
  }

  get poolCount(): number {
    return this.cards?.length ?? 0;
  }

  get categories(): string[] {
    const src = this.products ?? [];
    const set = new Set<string>();
    for (const p of src) {
      const t = (p as any)?.table_name ?? (p as any)?.table ?? '';
      if (t) set.add(String(t));
    }
    return Array.from(set).slice(0, 6);
  }

  private buildCards() {
    const src = this.products || [];
    if (!src.length) {
      this.cards = [];
      this.images = [];
      this.activeIndex = 0;
      return;
    }

    const picked = this.pickRandomUnique(src, 6);
    this.cards = picked;

    this.images = picked.map(p => {
      const table = (p as any).table_name ?? (p as any).table ?? '';
      return this.imagesSvc.getImage(table, p, 640);
    });

    this.activeIndex = 0;
  }

  private pickRandomUnique(arr: AnyProduct[], n: number): AnyProduct[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, Math.min(n, copy.length));
  }

  formatPrice(v: any): string {
    const n = this.parsePrice(v);
    if (n == null) return 'N/A';
    return new Intl.NumberFormat('hu-HU').format(n) + ' Ft';
  }

  private parsePrice(v: any): number | null {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : null;

    const nums = (String(v).match(/\d+(\.\d+)?/g) || [])
      .map(Number)
      .filter(Number.isFinite);

    if (!nums.length) return null;
    if (nums.length === 1) return Math.round(nums[0]);

    return Math.round((Math.min(...nums) + Math.max(...nums)) / 2);
  }

  specs(p: AnyProduct): Array<{ k: string; v: any }> {
    const d = p?.data;
    if (!d || typeof d !== 'object') return [];

    const hidden = new Set(['id', 'created_at', 'updated_at']);
    return Object.entries(d)
      .filter(([k]) => !hidden.has(String(k).toLowerCase()))
      .filter(([_, v]) => v !== null && v !== undefined && String(v).trim() !== '')
      .slice(0, 5)
      .map(([k, v]) => ({ k, v }));
  }
}
