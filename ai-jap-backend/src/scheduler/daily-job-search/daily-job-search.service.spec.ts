import { Test, TestingModule } from '@nestjs/testing';
import { DailyJobSearchService } from './daily-job-search.service';

describe('DailyJobSearchService', () => {
  let service: DailyJobSearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DailyJobSearchService],
    }).compile();

    service = module.get<DailyJobSearchService>(DailyJobSearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
