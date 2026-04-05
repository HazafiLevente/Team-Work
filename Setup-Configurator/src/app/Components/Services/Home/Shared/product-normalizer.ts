import { Product } from '../../../../Models/Product/product.model';

const str = (v: any) => String(v ?? '').trim();

const toInt = (v: any): number | null => {
  if (v == null || v === '') return null;

  if (typeof v === 'number') {
    return Number.isFinite(v) ? Math.round(v) : null;
  }

  const s = String(v).trim().replace(/\s+/g, '').replace(/,/g, '.');
  const nums = (s.match(/-?\d+(\.\d+)?/g) || []).map(Number).filter(Number.isFinite);

  if (!nums.length) return null;
  if (nums.length === 1) return Math.round(nums[0]);

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return Math.round((min + max) / 2);
};

function findLoosePrice(obj: any): any {
  if (!obj || typeof obj !== 'object') return null;

  const preferredKeys = [
    'price',
    'Price',
    'price_range',
    'Price Range (Ft)',
    'price_ft',
    'price_huf',
    'Price (Ft)',
    'Price Ft',
    'Unit Price',
    'Current Price',
    'Retail Price',
    'Sale Price'
  ];

  for (const key of preferredKeys) {
    if (obj[key] != null && obj[key] !== '') {
      return obj[key];
    }
  }

  for (const key of Object.keys(obj)) {
    const k = key.toLowerCase();
    if (
      k.includes('price') ||
      k.includes('ár') ||
      k.includes('ar') ||
      k.includes('ft') ||
      k.includes('huf')
    ) {
      const value = obj[key];
      if (value != null && value !== '') return value;
    }
  }

  return null;
}

function mergeAllData(raw: any, d: any): any {
  const out: any = {};

  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw)) {
      if (v !== undefined) out[k] = v;
    }
  }

  if (d && typeof d === 'object') {
    for (const [k, v] of Object.entries(d)) {
      if (v !== undefined) out[k] = v;
    }
  }

  if (raw?.fields && typeof raw.fields === 'object') {
    for (const [k, v] of Object.entries(raw.fields)) {
      if (v !== undefined) out[k] = v;
    }
  }

  return out;
}

export function normalizeProduct(raw: any): Product {
  const d = raw?.data ?? raw ?? {};
  const merged = mergeAllData(raw, d);

  const id =
    toInt(raw?.id) ??
    toInt(raw?.ID) ??
    toInt(d?.id) ??
    toInt(d?.ID) ??
    0;

  const name =
    str(raw?.name) ||
    str(raw?.Name) ||
    str(d?.name) ||
    str(d?.Name) ||
    str(merged?.name) ||
    str(merged?.Name);

  const manufacturer =
    str(raw?.manufacturer) ||
    str(raw?.Manufacturer) ||
    str(d?.manufacturer) ||
    str(d?.Manufacturer) ||
    str(d?.brand) ||
    str(d?.Brand) ||
    str(merged?.manufacturer) ||
    str(merged?.Manufacturer) ||
    str(merged?.brand) ||
    str(merged?.Brand);

  const model =
    str(raw?.model) ||
    str(raw?.Model) ||
    str(d?.model) ||
    str(d?.Model) ||
    str(merged?.model) ||
    str(merged?.Model) ||
    str(d?.name) ||
    str(d?.Name);

  const table_name =
    str(raw?.table_name) ||
    str(raw?.table) ||
    str(d?.table_name) ||
    str(d?.table) ||
    str(merged?.table_name) ||
    str(merged?.table) ||
    str(merged?.category) ||
    str(merged?.type_name);

  const category =
    str(raw?.category) ||
    str(d?.category) ||
    str(merged?.category);

  const type =
    str(raw?.type) ||
    str(d?.type) ||
    str(merged?.type);

  const priceRaw =
    raw?.price ??
    raw?.Price ??
    raw?.price_range ??
    raw?.['Price Range (Ft)'] ??
    d?.price ??
    d?.Price ??
    d?.price_range ??
    d?.['Price Range (Ft)'] ??
    merged?.price ??
    merged?.Price ??
    merged?.price_range ??
    merged?.['Price Range (Ft)'] ??
    findLoosePrice(raw) ??
    findLoosePrice(d) ??
    findLoosePrice(merged);

  const priceNum = toInt(priceRaw);
  const price = (priceNum != null && priceNum > 0) ? priceNum : null;

  return {
    id,
    name: name || model,
    manufacturer,
    model,
    price,
    table: table_name,
    table_name,
    category: category || undefined,
    type: type || undefined,
    data: merged
  };
}

export function normalizeList(list: any[]): Product[] {
  return (list || []).map(x => normalizeProduct(x));
}
