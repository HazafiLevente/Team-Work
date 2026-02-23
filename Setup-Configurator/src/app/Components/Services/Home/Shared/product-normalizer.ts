import { Product } from '../../../../Models/Product/product.model';

const str = (v: any) => String(v ?? '').trim();

const toInt = (v: any): number | null => {
  if (v == null || v === '') return null;
  const s = String(v).trim().replace(/\s+/g, '').replace(/,/g, '.');
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
};

export function normalizeProduct(raw: any): Product {
  const d = raw?.data ?? raw ?? {};

  const id =
    toInt(raw?.id) ??
    toInt(raw?.ID) ??
    toInt(d?.id) ??
    toInt(d?.ID) ??
    0;

  const manufacturer =
    str(raw?.manufacturer) ||
    str(raw?.Manufacturer) ||
    str(d?.manufacturer) ||
    str(d?.Manufacturer) ||
    str(d?.brand) ||
    str(d?.Brand);

  const model =
    str(raw?.model) ||
    str(raw?.Model) ||
    str(d?.model) ||
    str(d?.Model) ||
    str(d?.name) ||
    str(d?.Name);

  const table_name =
    str(raw?.table_name) ||
    str(raw?.table) ||
    str(d?.table_name) ||
    str(d?.table);

  const category = str(raw?.category) || str(d?.category);
  const type = str(raw?.type) || str(d?.type);

  const priceRaw =
    raw?.price ??
    raw?.Price ??
    d?.price ??
    d?.Price;

  const priceNum = toInt(priceRaw);
  const price = (priceNum != null && priceNum > 0) ? priceNum : null;

  return {
    id,
    manufacturer,
    model,
    price,
    table: table_name,
    category: category || undefined,
    type: type || undefined,
  };
}

export function normalizeList(list: any[]): Product[] {
  return (list || []).map(x => normalizeProduct(x));
}
