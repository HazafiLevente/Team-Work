export interface SearchFilters {
  term: string;
  manufacturer: string;
  priceMin: number | null;
  priceMax: number | null;
  sort: string;
}
