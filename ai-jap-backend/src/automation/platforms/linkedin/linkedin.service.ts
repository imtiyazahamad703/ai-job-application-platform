import { Injectable, Logger } from '@nestjs/common';
import { PlaywrightService } from '../../playwright/playwright.service';
import { Job } from '../../../modules/jobs/schemas/job.schema';

@Injectable()
export class LinkedinService {
  private readonly logger = new Logger(LinkedinService.name);

  constructor(private readonly playwrightService: PlaywrightService) {}

  async searchJobs(
    keyword: string, 
    locations: string[] = ['Worldwide']
  ): Promise<Partial<Job>[]> {
    const location = locations.length > 0 ? locations[0] : 'Worldwide';
    this.logger.log(`Searching LinkedIn for: ${keyword} in ${location}`);
    
    const page = await this.playwrightService.getNewPage();
    const jobs: Partial<Job>[] = [];
    
    try {
      const url = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}`;

      await page.goto(url, { waitUntil: 'domcontentloaded' });
      
      // Basic scraping of public LinkedIn job search
      // (Simplified MVP logic - LinkedIn frequently changes class names)
      const jobCards = await page.$$('.job-search-card');
      
      let count = 0;
      for (const card of jobCards) {
        if (count >= 10) break; // MVP: limit to top 10 jobs per title to prevent excessive LLM costs and time
        
        try {
          const titleEl = await card.$('.base-search-card__title');
          const titleContent = titleEl ? await titleEl.textContent() : '';
          const title = titleContent ? titleContent.trim() : '';
          
          const companyEl = await card.$('.base-search-card__subtitle');
          const companyContent = companyEl ? await companyEl.textContent() : '';
          const company = companyContent ? companyContent.trim() : '';
          
          const locationEl = await card.$('.job-search-card__location');
          const locContent = locationEl ? await locationEl.textContent() : '';
          const loc = locContent ? locContent.trim() : '';
          
          const linkEl = await card.$('.base-card__full-link');
          const linkContent = linkEl ? await linkEl.getAttribute('href') : '';
          const jobUrl = linkContent ? linkContent.split('?')[0] : '';

          if (title && company && jobUrl) {
            // Click to load full description side-panel (or navigate if needed)
            // For MVP, we navigate to the jobUrl directly, extract text, then go back.
            // A more optimized approach is clicking the card and reading the side panel.
            
            // Wait a small bit before clicking to simulate human behavior
            await new Promise(r => setTimeout(r, 1000));
            
            // Navigate to job details page to extract full description
            const detailPage = await this.playwrightService.getNewPage();
            await detailPage.goto(jobUrl, { waitUntil: 'domcontentloaded' });
            
            // Wait for description to load
            await detailPage.waitForSelector('.show-more-less-html__markup', { timeout: 5000 }).catch(() => null);
            
            const descEl = await detailPage.$('.show-more-less-html__markup');
            let description = '';
            if (descEl) {
              description = await descEl.evaluate(el => (el as HTMLElement).innerText);
            } else {
              // fallback
              description = await detailPage.evaluate(() => document.body.innerText.substring(0, 5000));
            }
            
            await detailPage.close();

            jobs.push({
              title,
              company,
              location: loc,
              url: jobUrl,
              platform: 'LinkedIn',
              description,
            });
            count++;
          }
        } catch (cardError) {
          this.logger.error('Error scraping individual job card', cardError);
        }
      }
      
      return jobs;
    } catch (error) {
      this.logger.error('LinkedIn search failed', error);
      return [];
    } finally {
      await this.playwrightService.closePage(page);
    }
    
    return jobs;
  }
}
