class OrderItemDto {
  quantity: number;
  productId: string;
  sackPriceId?: string;
  perKiloPriceId?: string;
  isSpecialPrice?: boolean;
}

export class CreateOrderDto {
  customerId: string;
  orderItem: OrderItemDto[];
}
