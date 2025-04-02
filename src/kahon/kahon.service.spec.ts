import { Test, TestingModule } from '@nestjs/testing';
import { KahonService } from './kahon.service';

describe('KahonService', () => {
  let service: KahonService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KahonService],
    }).compile();

    service = module.get<KahonService>(KahonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
