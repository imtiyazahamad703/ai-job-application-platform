import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { chromium, Browser, BrowserContext, Page } from 'playwright';

@Injectable()
export class PlaywrightService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlaywrightService.name);
  private browser: Browser | null = null;
  private defaultContext: BrowserContext | null = null;

  async onModuleInit() {
    this.logger.log('Initializing Playwright Browser...');
    try {
      this.browser = await chromium.launch({
        headless: false, // User requested visible mode for local debugging
        args: ['--disable-blink-features=AutomationControlled'], // Basic stealth
      });
      this.defaultContext = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
      });
      this.logger.log('Playwright Browser initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Playwright', error);
    }
  }

  async onModuleDestroy() {
    if (this.browser) {
      this.logger.log('Closing Playwright Browser...');
      await this.browser.close();
    }
  }

  async getNewPage(): Promise<Page> {
    if (!this.defaultContext) {
      throw new Error('Playwright context is not initialized');
    }
    return this.defaultContext.newPage();
  }

  async closePage(page: Page) {
    try {
      if (!page.isClosed()) {
        await page.close();
      }
    } catch (e) {
      this.logger.error('Error closing page', e);
    }
  }
}
