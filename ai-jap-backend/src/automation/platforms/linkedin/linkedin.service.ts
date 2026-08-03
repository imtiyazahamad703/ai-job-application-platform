import { Injectable, Logger } from '@nestjs/common';
import { PlaywrightService } from '../../playwright/playwright.service';
import { Job } from '../../../jobs/schemas/job.schema';

@Injectable()
export class LinkedinService {
  private readonly logger = new Logger(LinkedinService.name);

  constructor(private readonly playwrightService: PlaywrightService) {}

  async searchJobs(keyword: string, location: string = 'Worldwide'): Promise<Partial<Job>[]> {
    this.logger.log(`Searching LinkedIn for: ${keyword} in ${location}`);
    
    const page = await this.playwrightService.getNewPage();
    const jobs: Partial<Job>[] = [];
    
    try {
      const url = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      
      // Basic scraping of public LinkedIn job search
      // (This is a simplified scraper for demonstration)
      await page.waitForSelector('.base-card', { timeout: 10000 }).catch(() => {
        this.logger.warn('No jobs found or timeout waiting for job cards');
      });

      const jobCards = await page.$$('.base-card');
      
      for (let i = 0; i < Math.min(jobCards.length, 10); i++) {
        const card = jobCards[i];
        try {
          const titleElement = await card.$('.base-search-card__title');
          const title = titleElement ? await titleElement.innerText() : 'Unknown Title';
          
          const companyElement = await card.$('.base-search-card__subtitle');
          const company = companyElement ? await companyElement.innerText() : 'Unknown Company';
          
          const locationElement = await card.$('.job-search-card__location');
          const jobLocation = locationElement ? await locationElement.innerText() : 'Unknown Location';
          
          const linkElement = await card.$('.base-card__full-link');
          const jobUrl = linkElement ? await linkElement.getAttribute('href') : '';
          
          if (title && company && jobUrl) {
            jobs.push({
              title: title.trim(),
              company: company.trim(),
              location: jobLocation.trim(),
              url: jobUrl.split('?')[0], // Remove tracking params
              platform: 'linkedin',
              isRemote: jobLocation.toLowerCase().includes('remote'),
              status: 'PENDING',
              skills: [keyword],
            });
          }
        } catch (e) {
          this.logger.error('Error parsing individual job card', e);
        }
      }
      
      this.logger.log(`Found ${jobs.length} jobs on LinkedIn for ${keyword}`);
    } catch (error) {
      this.logger.error(`Error searching LinkedIn jobs: ${error.message}`, error.stack);
    } finally {
      await this.playwrightService.closePage(page);
    }
    
    return jobs;
  }
}
