export type LogItem = {
  id?: number;
  created_at: Date;
  product_id: number;
  sku: string;
  ean: string;
  status: string;
  update_id: string;
  update_details: UpdateProductPriceAndStock;
  business_unit_id: number;
};

export type UpdateProductPriceAndStock = {
  type: "price" | "stock";
  ean?: string;
  productName?: string;
  oldStock?: number;
  newStock?: number;
  oldPrice?: number;
  newPrice?: number;
  note: string;
};
