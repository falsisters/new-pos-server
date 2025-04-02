class KahonItem {
  id: string;
  name: string;
  quantity: number;
}

export class EditKahonItemsDto {
  kahonItems: KahonItem[];
}
