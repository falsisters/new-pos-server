import { Test, TestingModule } from '@nestjs/testing';
import { SalesCheckController } from './sales-check.controller';

describe('SalesCheckController', () => {
  let controller: SalesCheckController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesCheckController],
    }).compile();

    controller = module.get<SalesCheckController>(SalesCheckController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
