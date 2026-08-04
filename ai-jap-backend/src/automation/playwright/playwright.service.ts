import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium, BrowserContext, Page } from 'playwright';
import * as path from 'path';

@Injectable()
export class PlaywrightService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlaywrightService.name);
  private persistentContext: BrowserContext | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.logger.log('Initializing Playwright Persistent Context...');
    try {
      const userDataDir = path.resolve(process.cwd(), '.playwright-session');
      
      this.persistentContext = await chromium.launchPersistentContext(userDataDir, {
        headless: false, // User requested visible mode for local debugging
        args: ['--disable-blink-features=AutomationControlled'], // Basic stealth
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
      });
      
      this.logger.log('Playwright Persistent Context initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Playwright', error);
    }
  }

  async onModuleDestroy() {
    if (this.persistentContext) {
      this.logger.log('Closing Playwright Persistent Context...');
      await this.persistentContext.close();
    }
  }

  async getNewPage(): Promise<Page> {
    if (!this.persistentContext) {
      throw new Error('Playwright context is not initialized');
    }
    return this.persistentContext.newPage();
  }

  async ensureLinkedinLogin(): Promise<boolean> {
    if (!this.persistentContext) return false;

    const email = this.configService.get<string>('LINKEDIN_EMAIL');
    const password = this.configService.get<string>('LINKEDIN_PASSWORD');

    if (!email || !password) {
      this.logger.warn('LinkedIn credentials missing from env. Cannot auto-login.');
      return false;
    }

    const page = await this.getNewPage();
    try {
      this.logger.log('Checking LinkedIn login status...');
      await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded' });
      
      // If we are redirected to login/guest page, we are not logged in
      const currentUrl = page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/guest/')) {
        this.logger.log('Not logged in to LinkedIn. Proceeding with auto-login...');
        await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });
        
        await page.fill('#username', email);
        await page.fill('#password', password);
        await page.click('button[type="submit"]');
        
        await page.waitForTimeout(5000); // Wait for potential captchas or loading
        
        const afterLoginUrl = page.url();
        if (afterLoginUrl.includes('/feed')) {
          this.logger.log('Successfully logged into LinkedIn.');
          return true;
        } else {
          this.logger.error('Login might have failed or got stuck on a challenge.');
          return false;
        }
      } else {
        this.logger.log('Already logged into LinkedIn using persistent session.');
        return true;
      }
    } catch (error) {
      this.logger.error('Error during LinkedIn login check', error);
      return false;
    } finally {
      await this.closePage(page);
    }
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
