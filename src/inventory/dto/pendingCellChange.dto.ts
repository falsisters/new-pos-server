export class PendingCellChangeDto {
  id: string;
  rowId?: string;
  rowIndex: number;
  columnIndex: number;
  cellId?: string;
  oldValue: string;
  newValue: string;
  formula?: string;
  color?: string;
  changeType: 'add' | 'update';
  timestamp: number;
  isFormulaChange: boolean;
}

export class BatchUpdateCellsDto {
  changes: PendingCellChangeDto[];
}

export class RowPositionUpdateDto {
  rowId: string;
  newRowIndex: number;
}

export class BatchUpdateRowPositionsDto {
  updates: RowPositionUpdateDto[];
}
