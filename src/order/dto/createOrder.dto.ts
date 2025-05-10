class OrderItemDto {
  quantity: number;
  productId: string;
  sackPriceId?: string;
  perKiloPriceId?: string;
}

export class CreateOrderDto {
  customerId: string;
  orderItem: OrderItemDto[];
}
