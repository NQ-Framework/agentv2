export type LogItem = {
  id?: number;
  created_at: Date;
  product_id: number;
  status: string;
  update_id: string;
  update_details: UpdateProductPriceAndStock;
  business_unit_id: number;
};

export type UpdateProductPriceAndStock = {
  type: "price-and-stock";
  ean?: string;
  productName?: string;
  oldStock: number;
  newStock: number;
  oldPrice: number;
  newPrice: number;
};
