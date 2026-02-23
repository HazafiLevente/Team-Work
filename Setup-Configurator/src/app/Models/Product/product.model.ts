export interface Product {
  id: number;
  table: string;
  manufacturer: string;
  model: string;
  price: number | null;
  category?: string;
  type?: string;
}
