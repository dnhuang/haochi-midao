export interface OrderItem {
  index: number;
  delivery: string;
  customer: string;
  items_ordered: string;
  phone_number: string;
  address: string;
  city: string;
  zip_code: string;
  item_quantities: Record<string, number>;
  isManual?: boolean;
}

export interface Discrepancy {
  food_item: string;
  parsed_total: number;
  expected_total: number;
}

export interface UploadResponse {
  orders: OrderItem[];
  discrepancies: Discrepancy[];
  food_columns: string[];
}

export interface MenuItem {
  id: number;
  item_zh: string;
  item_short_zh: string;
  item_en: string;
}

export interface MenuResponse {
  items: MenuItem[];
}

export interface SortedItem {
  item_name: string;
  quantity: number;
}

export interface AnalyzeResponse {
  sorted_items: SortedItem[];
  total_items: number;
  orders_analyzed: number;
}
