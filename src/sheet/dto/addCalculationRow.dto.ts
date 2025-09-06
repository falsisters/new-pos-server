export class AddCalculationRowDto {
  sheetId?: string;
  inventoryId?: string;
  rowIndex: number;
  description?: string;
  date?: Date;
}

export class AddCalculationRowsDto {
  sheetId?: string;
  inventoryId?: string;
  rowIndexes: number[];
  date?: Date;
}
