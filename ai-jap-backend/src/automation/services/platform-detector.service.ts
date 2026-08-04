import { Injectable, Logger } from '@nestjs/common';

export enum AtsPlatform {
  LINKEDIN_EASY_APPLY = 'LINKEDIN_EASY_APPLY',
  GREENHOUSE = 'GREENHOUSE',
  LEVER = 'LEVER',
  WORKDAY = 'WORKDAY',
  UNKNOWN = 'UNKNOWN',
}

@Injectable()
export class PlatformDetectorService {
  private readonly logger = new Logger(PlatformDetectorService.name);

  /**
   * Detects the ATS platform from a job URL.
   */
  detectPlatform(url: string): AtsPlatform {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();

      // LinkedIn (Note: We assume all linkedin job URLs in our DB are Easy Apply for the MVP, 
      // but in production, we'd need to visit the page to confirm the Easy Apply button exists).
      if (hostname.includes('linkedin.com')) {
        return AtsPlatform.LINKEDIN_EASY_APPLY;
      }

      if (hostname.includes('greenhouse.io')) {
        return AtsPlatform.GREENHOUSE;
      }

      if (hostname.includes('lever.co')) {
        return AtsPlatform.LEVER;
      }

      if (hostname.includes('myworkdayjobs.com')) {
        return AtsPlatform.WORKDAY;
      }

      return AtsPlatform.UNKNOWN;
    } catch (error) {
      this.logger.error(`Failed to parse URL for platform detection: ${url}`, error);
      return AtsPlatform.UNKNOWN;
    }
  }
}
