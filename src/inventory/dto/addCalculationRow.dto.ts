export class AddCalculationRowDto {
  sheetId?: string;
  inventoryId?: string;
  rowIndex: number;
  description?: string;
}

export class AddInventoryRowsDto {
  sheetId?: string;
  inventoryId?: string;
  rowIndexes: number[];
}
