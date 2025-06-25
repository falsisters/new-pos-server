class OrderItemDto {
  quantity: number;
  productId: string;
  sackPriceId?: string;
  perKiloPriceId?: string;
  isSpecialPrice?: boolean;
}

export class CreateOrderDto {
  customerId?: string; // Make optional for cashier creation
  cashierId?: string; // Add cashier ID for cashier-specific orders
  userId: string;
  orderItem: OrderItemDto[];
}
