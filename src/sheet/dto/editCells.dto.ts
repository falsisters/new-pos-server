class Cell {
  id: string;
  value: string;
  formula?: string;
  color?: string;
}

export class EditCellsDto {
  cells: Cell[];
}
