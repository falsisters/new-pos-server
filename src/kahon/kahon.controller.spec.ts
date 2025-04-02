import { Test, TestingModule } from '@nestjs/testing';
import { KahonController } from './kahon.controller';

describe('KahonController', () => {
  let controller: KahonController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KahonController],
    }).compile();

    controller = module.get<KahonController>(KahonController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
