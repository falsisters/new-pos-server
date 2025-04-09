export class AddCalculationRowDto {
  inventoryId: string;
  rowIndex: number;
}

export class AddInventoryRowsDto {
  inventoryId: string;
  rowIndexes: number[];
}
