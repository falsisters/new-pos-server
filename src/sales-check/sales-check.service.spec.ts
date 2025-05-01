import { Test, TestingModule } from '@nestjs/testing';
import { SalesCheckService } from './sales-check.service';

describe('SalesCheckService', () => {
  let service: SalesCheckService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SalesCheckService],
    }).compile();

    service = module.get<SalesCheckService>(SalesCheckService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
