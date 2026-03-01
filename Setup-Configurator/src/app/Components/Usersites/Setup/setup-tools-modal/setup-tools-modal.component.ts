
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { SetupPcBuilderModalComponent } from '../setup-pc-builder-modal/setup-pc-builder-modal.component';
import { HomeTheaterBuilderComponent }
  from '../home-theater-builder-modal/home-theater-builder.component';
type UiItem = {
  category: string;
  display_name: string;
  manufacturer?: string;
};

type PcBuildRow = any;

type CarOption = {
  id: number;
  source_table: string;
  fk_column: string;
  Manufacturer: string;
  Model: string;
  display_name: string;
};

type CarSetupRow = any;

@Component({
  selector: 'app-setup-tools-modal',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, SetupPcBuilderModalComponent,HomeTheaterBuilderComponent],
  templateUrl: './setup-tools-modal.component.html',
  styleUrls: ['./setup-tools-modal.component.css']
})
export class SetupToolsModalComponent implements OnChanges {

  @Input() setup: any;

  // opcionális: ha a jobbklikk menüből a PC/Cars füllel akarod nyitni
  @Input() startTab: 'items' | 'pc' | 'cars' | 'ht' = 'items';

  @Output() close = new EventEmitter<void>();

  tab: 'items' | 'pc' | 'cars' | 'ht' = 'items';

  // items
  loading = false;
  items: UiItem[] = [];
  errorMsg = '';

  // pc builds
  pcLoading = false;
  pcs: PcBuildRow[] = [];
  pcError = '';

  pcCreateName = '';
  pcCreateSaving = false;
  pcCreateError = '';

  // ✅ cars
  carOptionsLoading = false;
  carOptions: CarOption[] = [];
  carOptionsError = '';

  selectedCarKey = ''; // `${source_table}:${id}`
  carCreateSaving = false;
  carCreateError = '';

  carLoading = false;
  cars: CarSetupRow[] = [];
  carError = '';

  // pc builder modal
  pcBuilderOpen = false;
  pcBuilderRow: any = null;

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['setup']) return;
    if (!this.setup) return;

    this.tab = this.startTab ?? 'items';

    this.loadItems();
    this.loadPcBuilds();

    // cars
    this.loadCarOptions();
    this.loadCars();


    this.loadHtCatalog();
  }

  private setupId(): any {
    return this.setup?.id ?? this.setup?.setup_id ?? this.setup?.setupId;
  }

  private loadItems(): void {
    const setupId = this.setupId();
    if (!setupId) return;

    this.loading = true;
    this.items = [];
    this.errorMsg = '';

    this.http.get<UiItem[]>(`/api/setup/${setupId}/children`, { withCredentials: true })
      .subscribe({
        next: (items) => {
          this.items = Array.isArray(items) ? items : [];
          this.loading = false;
        },
        error: (err) => {
          console.error('❌ Tools modal children hiba:', err);
          this.items = [];
          this.loading = false;
          this.errorMsg = 'Betöltés sikertelen.';
        }
      });
  }

  private loadPcBuilds(): void {
    const setupId = this.setupId();
    if (!setupId) return;

    this.pcLoading = true;
    this.pcs = [];
    this.pcError = '';

    this.http.get<any>(`/api/setup/${setupId}/pcbuilds`, { withCredentials: true })
      .subscribe({
        next: (res) => {
          const list = res?.pcs;
          this.pcs = Array.isArray(list) ? list : [];
          this.pcLoading = false;
        },
        error: (err) => {
          console.error('❌ pcbuilds hiba:', err);
          this.pcs = [];
          this.pcLoading = false;
          this.pcError = 'PC-k betöltése sikertelen.';
        }
      });
  }

  // ---------- Cars ----------
  private loadCarOptions(): void {
    this.carOptionsLoading = true;
    this.carOptions = [];
    this.carOptionsError = '';

    this.http.get<any>(`/api/setup/car-options`, { withCredentials: true })
      .subscribe({
        next: (res) => {
          const list = res?.cars;
          this.carOptions = Array.isArray(list) ? list : [];
          this.carOptionsLoading = false;
        },
        error: (err) => {
          console.error('❌ car-options hiba:', err);
          this.carOptions = [];
          this.carOptionsLoading = false;
          this.carOptionsError = 'Autó lista betöltése sikertelen.';
        }
      });
  }

  private loadCars(): void {
    const setupId = this.setupId();
    if (!setupId) return;

    this.carLoading = true;
    this.cars = [];
    this.carError = '';

    this.http.get<any>(`/api/setup/${setupId}/cars`, { withCredentials: true })
      .subscribe({
        next: (res) => {
          const list = res?.cars;
          this.cars = Array.isArray(list) ? list : [];
          this.carLoading = false;
        },
        error: (err) => {
          console.error('❌ cars list hiba:', err);
          this.cars = [];
          this.carLoading = false;
          this.carError = 'Autók betöltése sikertelen.';
        }
      });
  }

  createCar(): void {
    const setupId = this.setupId();
    if (!setupId) return;

    if (!this.selectedCarKey) {
      this.carCreateError = 'Válassz autót.';
      return;
    }

    const [source_table, idStr] = this.selectedCarKey.split(':');
    const car_id = Number(idStr);
    if (!source_table || !car_id || Number.isNaN(car_id)) {
      this.carCreateError = 'Hibás autó kiválasztás.';
      return;
    }

    this.carCreateSaving = true;
    this.carCreateError = '';

    this.http.post<any>(
      `/api/setup/${setupId}/cars`,
      { source_table, car_id },
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        const created = res?.car;
        if (created) this.cars = [created, ...this.cars];
        this.selectedCarKey = '';
        this.carCreateSaving = false;

        // ha az items tabon nézed, frissítsük lazán (opcionális)
        // this.loadItems();
      },
      error: (err) => {
        console.error('❌ car create hiba:', err);
        this.carCreateError = 'Létrehozás sikertelen.';
        this.carCreateSaving = false;
      }
    });
  }

  // ---------- UI helpers ----------
  title(): string {
    return this.setup?.setup_name ?? this.setup?.name ?? 'Névtelen setup';
  }

  onBackdropClick(): void {
    this.close.emit();
  }

  stop(e: MouseEvent): void {
    e.stopPropagation();
  }

  // ---------- PC create ----------
  createPc(): void {
    const setupId = this.setupId();
    if (!setupId) return;

    const pc_name = (this.pcCreateName || '').trim();
    if (!pc_name) {
      this.pcCreateError = 'Adj nevet a PC-nek.';
      return;
    }

    this.pcCreateSaving = true;
    this.pcCreateError = '';

    this.http.post<any>(`/api/setup/${setupId}/pcbuilds`, { pc_name }, { withCredentials: true })
      .subscribe({
        next: (res) => {
          const created = res?.pc;
          if (created) this.pcs = [created, ...this.pcs];
          this.pcCreateName = '';
          this.pcCreateSaving = false;
        },
        error: (err) => {
          console.error('❌ pc create hiba:', err);
          this.pcCreateError = 'Létrehozás sikertelen.';
          this.pcCreateSaving = false;
        }
      });
  }

  openPcBuilder(pc: any): void {
    this.pcBuilderRow = pc;
    this.pcBuilderOpen = true;
  }

  closePcBuilder(): void {
    this.pcBuilderOpen = false;
    this.pcBuilderRow = null;
  }

  onPcSaved(updatedPc: any): void {
    const id = updatedPc?.id;
    if (!id) return;

    this.pcs = this.pcs.map(p => (p?.id === id ? { ...p, ...updatedPc } : p));
  }



  // ---- HT FORM ----

  htLayout: '' | '2.1' | '5.1' | '7.1' = '';

  htSpeakers: { key: string, label: string }[] = [];

  htForm: any = {
    receiver: ''
  };

  generateHtInputs(): void {

    this.htSpeakers = [];
    this.htForm = { receiver: '' };

    if (this.htLayout === '2.1') {
      this.htSpeakers = [
        { key: 'front_left', label: 'Front Left' },
        { key: 'front_right', label: 'Front Right' },
        { key: 'subwoofer', label: 'Subwoofer' }
      ];
    }

    if (this.htLayout === '5.1') {
      this.htSpeakers = [
        { key: 'front_left', label: 'Front Left' },
        { key: 'front_right', label: 'Front Right' },
        { key: 'center', label: 'Center' },
        { key: 'back_left', label: 'Back Left' },
        { key: 'back_right', label: 'Back Right' },
        { key: 'subwoofer', label: 'Subwoofer' }
      ];
    }

    if (this.htLayout === '7.1') {
      this.htSpeakers = [
        { key: 'front_left', label: 'Front Left' },
        { key: 'front_right', label: 'Front Right' },
        { key: 'center', label: 'Center' },
        { key: 'surround_left', label: 'Surround Left' },
        { key: 'surround_right', label: 'Surround Right' },
        { key: 'back_left', label: 'Back Left' },
        { key: 'back_right', label: 'Back Right' },
        { key: 'subwoofer', label: 'Subwoofer' }
      ];
    }

    // form inicializálás
    this.htSpeakers.forEach(sp => {
      this.htForm[sp.key] = '';
    });
  }

  htTitle = '';
  htSaving = false;
  htSaveSuccess = false;
  htSaveError = '';

  saveHtConfig(): void {

    const setupId = this.setupId();
    if (!setupId) return;

    this.htSaving = true;
    this.htSaveSuccess = false;
    this.htSaveError = '';

    const payload = {
      setup_id: setupId,
      layout: this.htLayout,
      title: this.htTitle,
      devices: this.htForm
    };

    this.http.post('/api/home-theater/build', payload, {
      withCredentials: true
    }).subscribe({
      next: () => {
        this.htSaving = false;
        this.htSaveSuccess = true;

        // opcionális: 2 mp után eltűnik
        setTimeout(() => {
          this.htSaveSuccess = false;
        }, 2000);
      },
      error: (err) => {
        this.htSaving = false;
        this.htSaveError = 'Mentés sikertelen.';
        console.error(err);
      }
    });
  }


  // ---- HT CATALOG ----

  htCatalogLoading = false;

  htCatalog: any = {
    receivers: [],
    frontSpeakers: [],
    centerSpeakers: [],
    sideSpeakers: [],
    backSpeakers: [],
    subwoofers: []
  };

  private loadHtCatalog(): void {

    this.htCatalogLoading = true;

    this.http.get<any>('/api/home-theater/catalog', { withCredentials: true })
      .subscribe({
        next: (res) => {
          this.htCatalog = res || {};
          this.htCatalogLoading = false;
        },
        error: (err) => {
          console.error('HT catalog error:', err);
          this.htCatalogLoading = false;
        }
      });
  }
}
