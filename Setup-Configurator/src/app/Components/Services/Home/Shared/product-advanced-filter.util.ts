import { Product } from '../../../../Models/Product/product.model';
import { CarFilters } from '../../../Home/Filterparts/carfilter/carfilter.component';
import { ComputerFilters } from '../../../Home/Filterparts/computerfilter/computerfilter/computerfilter.component';
import { HomeTheaterFiltersV2 } from '../../../Home/Filterparts/hometheaterfilter/hometheaterfilter.component';
import { InstrumentFilters } from '../../../Home/Filterparts/instrumentfilter/instrumentfilter.component';

function s(v: any): string {
  return String(v ?? '').trim();
}

function sl(v: any): string {
  return s(v).toLowerCase();
}

function toNum(v: any): number | null {
  if (v == null || v === '') return null;

  if (typeof v === 'number') {
    return Number.isFinite(v) ? v : null;
  }

  const m = String(v).trim().replace(',', '.').match(/-?\d+(\.\d+)?/);
  if (!m) return null;

  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function contains(hay: any, needle: any): boolean {
  return sl(hay).includes(sl(needle));
}

function eqText(a: any, b: any): boolean {
  return sl(a) === sl(b);
}

function getField(item: Product | any, key: string): any {
  if (!item) return '';

  if (item.data && key in item.data) return item.data[key];
  if (key in item) return item[key];

  return '';
}

function getManufacturer(item: Product | any): string {
  return String(
    getField(item, 'manufacturer') ||
    getField(item, 'brand') ||
    ''
  ).trim();
}

function getModel(item: Product | any): string {
  return String(
    getField(item, 'model') ||
    getField(item, 'name') ||
    ''
  ).trim();
}

function matchModelLike(item: Product | any, needle: string): boolean {
  if (!s(needle)) return true;

  const manufacturer = getManufacturer(item);
  const model = getModel(item);
  const combined = `${manufacturer} ${model}`.trim();

  return contains(combined, needle);
}

function passesRange(value: any, minRaw: any, maxRaw: any): boolean {
  const val = toNum(value);
  const min = toNum(minRaw);
  const max = toNum(maxRaw);

  if (min != null && (val == null || val < min)) return false;
  if (max != null && (val == null || val > max)) return false;

  return true;
}

function passesDynamic(item: Product, dynamic: Record<string, any>): boolean {
  for (const [key, rule] of Object.entries(dynamic || {})) {
    const val = getField(item, key);

    if (typeof rule === 'boolean') {
      if (!rule) continue;
      const raw = sl(val);
      if (!['true', '1', 'yes', 'igen'].includes(raw)) return false;
      continue;
    }

    if (rule && typeof rule === 'object' && ('min' in rule || 'max' in rule)) {
      if (!passesRange(val, (rule as any).min, (rule as any).max)) return false;
      continue;
    }

    if (s(rule)) {
      if (!eqText(val, rule)) return false;
    }
  }

  return true;
}

export function passesCarFilters(item: Product, f: CarFilters): boolean {
  if (f.manufacturer && !contains(getField(item, 'manufacturer'), f.manufacturer)) return false;
  if (f.model && !matchModelLike(item, f.model)) return false;
  if (!passesRange(getField(item, 'price'), f.priceMin, f.priceMax)) return false;
  if (f.bodyType && !contains(getField(item, 'body_type'), f.bodyType)) return false;
  if (!passesRange(getField(item, 'horsepower'), f.hpMin, f.hpMax)) return false;
  if (!passesRange(getField(item, 'zero_to_hundred') || getField(item, 'acceleration'), f.accelMin, f.accelMax)) return false;
  if (!passesRange(getField(item, 'seats'), f.seatsMin, f.seatsMax)) return false;
  if (f.fuel && !contains(getField(item, 'fuel_type'), f.fuel)) return false;
  if (!passesRange(getField(item, 'year'), f.yearMin, f.yearMax)) return false;
  if (f.transmission && !contains(getField(item, 'transmission'), f.transmission)) return false;

  return true;
}

export function passesComputerFilters(item: Product, f: ComputerFilters): boolean {
  const tableValue =
    getField(item, 'table_name') ||
    getField(item, 'table') ||
    getField(item, 'category') ||
    getField(item, 'type_name');

  if (f.tableName && !eqText(tableValue, f.tableName)) return false;
  if (f.manufacturer && !contains(getField(item, 'manufacturer'), f.manufacturer)) return false;
  if (f.model && !matchModelLike(item, f.model)) return false;
  if (!passesRange(getField(item, 'price'), f.priceMin, f.priceMax)) return false;
  if (!passesDynamic(item, f.dynamic)) return false;

  return true;
}

export function passesHtFilters(item: Product, f: HomeTheaterFiltersV2): boolean {
  const tableValue =
    getField(item, 'table_name') ||
    getField(item, 'table') ||
    getField(item, 'category') ||
    getField(item, 'type_name');

  if (f.tableName && !eqText(tableValue, f.tableName)) return false;
  if (f.manufacturer && !contains(getField(item, 'manufacturer'), f.manufacturer)) return false;
  if (f.model && !matchModelLike(item, f.model)) return false;
  if (!passesRange(getField(item, 'price'), f.priceMin, f.priceMax)) return false;
  if (!passesDynamic(item, f.dynamic)) return false;

  return true;
}

export function passesInstrumentFilters(item: Product, f: InstrumentFilters): boolean {
  const tableValue =
    getField(item, 'table_name') ||
    getField(item, 'table') ||
    getField(item, 'category') ||
    getField(item, 'type_name');

  const itemType =
    sl(getField(item, 'item_type')) ||
    sl(getField(item, 'kind')) ||
    sl(getField(item, 'type_name')) ||
    sl(getField(item, 'type'));

  if (f.itemType === 'accessory') {
    const accessoryLike =
      itemType.includes('accessory') ||
      tableValue.toString().toLowerCase().includes('accessory') ||
      itemType.includes('cable') ||
      itemType.includes('stand') ||
      itemType.includes('case') ||
      itemType.includes('pedal');

    if (!accessoryLike) return false;
  }

  if (f.itemType === 'instrument') {
    const tableLower = sl(tableValue);

    const instrumentLike =
      itemType.includes('inst') ||
      itemType.includes('guitar') ||
      itemType.includes('drum') ||
      itemType.includes('trumpet') ||
      itemType.includes('sax') ||
      itemType.includes('piano') ||
      itemType.includes('violin') ||
      itemType.includes('instrument') ||
      tableLower.includes('inst') ||
      tableLower.includes('guitar') ||
      tableLower.includes('drum') ||
      tableLower.includes('trumpet') ||
      tableLower.includes('sax');

    if (!instrumentLike) return false;
  }

  if (f.tableName && !eqText(tableValue, f.tableName)) return false;
  if (f.manufacturer && !contains(getField(item, 'manufacturer'), f.manufacturer)) return false;
  if (f.model && !matchModelLike(item, f.model)) return false;
  if (!passesRange(getField(item, 'price'), f.minPrice, f.maxPrice)) return false;

  if (f.isUsed) {
    const used = sl(getField(item, 'is_used') || getField(item, 'condition'));
    if (!['true', '1', 'yes', 'igen', 'used', 'használt'].includes(used)) return false;
  }

  return true;
}
