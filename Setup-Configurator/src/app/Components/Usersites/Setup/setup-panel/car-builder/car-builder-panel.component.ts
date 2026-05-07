import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-car-builder-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './car-builder-panel.component.html',
  styleUrls: ['./car-builder-panel.component.css']
})
export class CarBuilderPanelComponent implements OnChanges {
  @Input() setup: any;
  @Input() editChildSetupId: number | null = null;
  @Input() initialProductId: number | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  loading = false;
  saving = false;
  error = '';
  success = '';

  cars: any[] = [];
  selectedCarKey = '';

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['setup'] && this.setup) {
      this.resetForm();
      this.loadCarOptions();
    }
    if (changes['initialProductId'] && this.initialProductId != null) {
      this.selectedCarKey = String(this.initialProductId);
    }
  }

  private resetForm(): void {
    this.selectedCarKey = '';
    this.loading = false;
    this.saving = false;
    this.error = '';
    this.success = '';
  }

  private setupId(): number | null {
    const id = this.setup?.id ?? this.setup?.setup_id ?? this.setup?.setupId ?? null;
    return id == null ? null : Number(id);
  }

  private unwrapCars(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.cars)) return res.cars;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  }

  public getCarKey(car: any): string {
    return String(car?.id ?? car?.ID ?? '');
  }

  private parseCarKey(key: string): number | null {
    const parsedId = key == null || key === '' ? null : Number(key);
    return parsedId == null || Number.isNaN(parsedId) ? null : parsedId;
  }

  loadCarOptions(): void {
    this.loading = true;
    this.error = '';
    this.success = '';

    this.http.get<any>('/api/setup/car-options', { withCredentials: true }).subscribe({
      next: (res) => {
        this.cars = this.unwrapCars(res).map((car: any) => ({
          ...car,
          __carKey: this.getCarKey(car)
        }));
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ car options load error:', err);
        this.error = 'Nem sikerült betölteni az autólistát.';
        this.loading = false;
      }
    });
  }


  getSelectedCar(): any | null {
    if (!this.selectedCarKey) return null;
    return this.cars.find(car => car.__carKey === this.selectedCarKey) ?? null;
  }

  getCarLabel(car: any): string {
    return String(
      car?.display_name ??
      [car?.Manufacturer, car?.Model].filter(Boolean).join(' ') ??
      `Autó #${car?.id ?? '?'}`
    ).trim();
  }

  trackCar(_: number, car: any): string {
    return car?.__carKey ?? this.getCarKey(car);
  }

  saveCar(): void {
    const sid = this.setupId();
    if (!sid) {
      this.error = 'Hiányzik a setup azonosító.';
      return;
    }

    const carId = this.parseCarKey(this.selectedCarKey);
    if (carId == null) {
      this.error = 'Válassz egy autót.';
      return;
    }

    const selected = this.getSelectedCar();
    if (!selected) {
      this.error = 'A kiválasztott autó nem található.';
      return;
    }

    this.saving = true;
    this.error = '';
    this.success = '';

    const payload = {
      car_id: carId
    };

    const request = this.editChildSetupId
      ? this.http.patch<any>(`/api/setup/replace-child-device/${this.editChildSetupId}`, { product_id: carId }, { withCredentials: true })
      : this.http.post<any>(`/api/setup/${sid}/add-car`, payload, { withCredentials: true });

    request.subscribe({
      next: () => {
        this.saving = false;
        this.success = 'Autó sikeresen hozzáadva.';
        this.saved.emit();
      },
      error: (err) => {
        console.error('❌ car add error:', err);
        this.saving = false;
        this.error = 'Nem sikerült hozzáadni az autót.';
      }
    });
  }
}

