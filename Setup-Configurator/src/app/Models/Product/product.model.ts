export interface Product {
  id: number;
  manufacturer: string;
  model: string;
  price: number | null;
  table?: string;
  table_name?: string;
  category?: string;
  type?: string;
  data?: any;
}
