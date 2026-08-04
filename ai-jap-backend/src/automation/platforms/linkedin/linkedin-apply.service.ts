import { Injectable, Logger } from '@nestjs/common';
import { PlaywrightService } from '../../playwright/playwright.service';
import { DomParserService } from '../../services/dom-parser.service';
import { FormFillerService } from '../../services/form-filler.service';
import { Page } from 'playwright';
import { UserDocument } from '../../../modules/users/schemas/user.schema';
import { SearchPersona } from '../../../modules/jobs/schemas/search-persona.schema';

@Injectable()
export class LinkedinApplyService {
  private readonly logger = new Logger(LinkedinApplyService.name);

  constructor(
    private readonly playwrightService: PlaywrightService,
    private readonly domParserService: DomParserService,
    private readonly formFillerService: FormFillerService
  ) {}

  /**
   * Automates the LinkedIn Easy Apply workflow for a specific job.
   */
  async applyToJob(
    jobUrl: string, 
    userProfile: UserDocument, 
    persona: SearchPersona
  ): Promise<{ success: boolean; logs: string[] }> {
    const logs: string[] = [];
    const log = (msg: string) => {
      this.logger.log(msg);
      logs.push(msg);
    };

    log(`Starting LinkedIn Easy Apply for: ${jobUrl}`);
    let page: Page | null = null;
    
    try {
      // Ensure we are logged into LinkedIn first
      const loggedIn = await this.playwrightService.ensureLinkedinLogin();
      if (!loggedIn) {
        log('Failed to log into LinkedIn. Aborting application.');
        return { success: false, logs };
      }

      page = await this.playwrightService.getNewPage();
      await page.goto(jobUrl, { waitUntil: 'domcontentloaded' });
      
      // Give the page a moment to render
      await page.waitForTimeout(2000);

      // Check if "Easy Apply" button exists
      // The button text could be inside a span, or the class could be something like 'jobs-apply-button'
      const easyApplyBtn = await page.$('button:has-text("Easy Apply"), button:has-text("Apply now")');
      
      if (!easyApplyBtn) {
        log('Easy Apply button not found. This might be a standard apply or the job is no longer available.');
        return { success: false, logs };
      }

      log('Found Easy Apply button. Clicking...');
      await easyApplyBtn.click();
      await page.waitForTimeout(2000);

      let isApplicationComplete = false;
      let loopCount = 0;
      const MAX_LOOPS = 15; // Prevent infinite loops

      while (!isApplicationComplete && loopCount < MAX_LOOPS) {
        loopCount++;
        log(`--- Application Step ${loopCount} ---`);

        // Check for success screen or dismiss modal button indicating completion
        const successHeader = await page.$('h3:has-text("Application sent")');
        if (successHeader) {
          log('Application sent successfully!');
          isApplicationComplete = true;
          
          // Click "Done" or "Dismiss" to close the modal
          const doneBtn = await page.$('button:has-text("Done"), button[aria-label="Dismiss"]');
          if (doneBtn) await doneBtn.click();
          break;
        }

        // Wait a bit for the modal step to fully render
        await page.waitForTimeout(1000);

        // Get condensed DOM specifically from the modal to avoid distraction
        // LinkedIn uses a div with class artdeco-modal for the Easy Apply popup
        const modalDom = await page.evaluate(() => {
          const modal = document.querySelector('.artdeco-modal');
          if (!modal) return null;
          
          // We can reuse a simplified version of the logic from DomParserService just for the modal
          // But since DomParserService evaluates on the whole page, let's inject a scoped selector if possible,
          // or just pass the page to DomParserService and let it parse the whole page. The AI can figure it out.
          return null; // We'll just use the main service below.
        });

        // We will just use our robust DomParserService on the whole page for simplicity right now.
        log('Parsing DOM for AI analysis...');
        const condensedDom = await this.domParserService.getCondensedDom(page);
        
        log('Planning actions via Gemini...');
        const actions = await this.formFillerService.planActions(condensedDom, userProfile, persona);
        
        log(`Executing ${actions.length} actions...`);
        for (const action of actions) {
          try {
            log(`Action: ${action.action} on ${action.selector} ${action.value ? '(Value: ' + action.value + ')' : ''}`);
            log(`Reasoning: ${action.reasoning}`);
            
            // Wait for element to be visible
            const element = await page.waitForSelector(action.selector, { state: 'visible', timeout: 3000 });
            
            if (action.action === 'type') {
              // Clear first
              await element.fill('');
              await element.type(action.value || '', { delay: 50 });
            } else if (action.action === 'click') {
              await element.click();
            } else if (action.action === 'select') {
              await page.selectOption(action.selector, action.value || '');
            } else if (action.action === 'check') {
              const isChecked = await element.isChecked();
              if (!isChecked) await element.click();
            } else if (action.action === 'uncheck') {
              const isChecked = await element.isChecked();
              if (isChecked) await element.click();
            } else if (action.action === 'upload') {
              // TODO: Integrate with ResumeService to download PDF from Drive locally, then upload.
              // For MVP, we log and skip, or assume the default resume is pre-selected on LinkedIn.
              log('Upload action requested, assuming pre-uploaded resume for MVP.');
            }
            
            // Small delay between actions
            await page.waitForTimeout(500);

          } catch (actionErr) {
            log(`Warning: Failed to execute action ${action.action} on ${action.selector}. Error: ${actionErr.message}`);
          }
        }
        
        // Wait a bit to see if the page transitioned
        await page.waitForTimeout(2000);
      }

      if (loopCount >= MAX_LOOPS) {
        log('Reached maximum loop count. Application might have failed or got stuck.');
        return { success: false, logs };
      }

      return { success: true, logs };

    } catch (error) {
      log(`Error during LinkedIn Easy Apply: ${error.message}`);
      this.logger.error('LinkedIn Apply Error', error);
      return { success: false, logs };
    } finally {
      if (page) {
        await this.playwrightService.closePage(page);
      }
    }
  }
}
