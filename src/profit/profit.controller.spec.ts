import { Test, TestingModule } from '@nestjs/testing';
import { ProfitController } from './profit.controller';

describe('ProfitController', () => {
  let controller: ProfitController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfitController],
    }).compile();

    controller = module.get<ProfitController>(ProfitController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
