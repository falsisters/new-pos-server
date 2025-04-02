class Cell {
  id: string;
  value: string;
  formula?: string;
}

export class EditCellsDto {
  cells: Cell[];
}
