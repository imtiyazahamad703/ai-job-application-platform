import { Injectable, Logger } from '@nestjs/common';
import { PlaywrightService } from '../../playwright/playwright.service';
import { DomParserService } from '../../services/dom-parser.service';
import { FormFillerService } from '../../services/form-filler.service';
import { Page } from 'playwright';
import { UserDocument } from '../../../modules/authentication/schemas/user.schema';
import { SearchPersonaDocument } from '../../../modules/jobs/schemas/search-persona.schema';
import { ResumeService } from '../../../modules/resume/resume.service';
import * as fs from 'fs/promises';

@Injectable()
export class GenericApplyService {
  private readonly logger = new Logger(GenericApplyService.name);

  constructor(
    private readonly playwrightService: PlaywrightService,
    private readonly domParserService: DomParserService,
    private readonly formFillerService: FormFillerService,
    private readonly resumeService: ResumeService
  ) {}

  /**
   * Automates the application workflow for a generic external career site.
   */
  async applyToJob(
    jobUrl: string, 
    userProfile: UserDocument, 
    persona: SearchPersonaDocument
  ): Promise<{ success: boolean; logs: string[] }> {
    const logs: string[] = [];
    const log = (msg: string) => {
      this.logger.log(msg);
      logs.push(msg);
    };

    log(`Starting Generic Career Site Apply for: ${jobUrl}`);
    let page: Page | null = null;
    let downloadedResumePath: string | null = null;
    
    try {
      page = await this.playwrightService.getNewPage();
      await page.goto(jobUrl, { waitUntil: 'domcontentloaded' });
      
      // Wait for any client-side rendering
      await page.waitForTimeout(3000);

      // Check if we need to click an initial "Apply" button to reveal the form
      // Often career sites have an "Apply Now" button before showing the actual form fields
      const initialApplyBtn = await page.$('button:has-text("Apply"), a:has-text("Apply"), button:has-text("Apply Now"), a:has-text("Apply Now")');
      if (initialApplyBtn) {
        log('Found initial Apply button. Clicking to reveal form...');
        await initialApplyBtn.click();
        await page.waitForTimeout(3000); // wait for form to load
      }

      let isApplicationComplete = false;
      let loopCount = 0;
      const MAX_LOOPS = 10; // Prevent infinite loops

      while (!isApplicationComplete && loopCount < MAX_LOOPS) {
        loopCount++;
        log(`--- Application Step ${loopCount} ---`);

        // Check for success indicators
        const successIndicator = await page.$('h1:has-text("Thank you"), h2:has-text("Thank you"), h1:has-text("Application submitted"), text="successfully submitted"');
        if (successIndicator) {
          log('Application sent successfully!');
          isApplicationComplete = true;
          break;
        }

        log('Parsing DOM for AI analysis...');
        const condensedDom = await this.domParserService.getCondensedDom(page);
        
        log('Planning actions via Gemini...');
        const actions = await this.formFillerService.planActions(condensedDom, userProfile, persona);
        
        if (!actions || actions.length === 0) {
           log('No actions returned by AI. We might be stuck or the form is complete.');
           break;
        }

        log(`Executing ${actions.length} actions...`);
        let madeProgress = false;

        for (const action of actions) {
          try {
            log(`Action: ${action.action} on ${action.selector} ${action.value ? '(Value: ' + action.value + ')' : ''}`);
            log(`Reasoning: ${action.reasoning}`);
            
            // Wait for element to be visible
            const element = await page.waitForSelector(action.selector, { state: 'visible', timeout: 5000 });
            
            if (action.action === 'type') {
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
              if (persona.linkedResumeId) {
                if (!downloadedResumePath) {
                  log(`Downloading resume ${persona.linkedResumeId} from Google Drive...`);
                  downloadedResumePath = await this.resumeService.downloadResumeLocally(userProfile._id.toString(), persona.linkedResumeId as string);
                }
                log(`Uploading resume from ${downloadedResumePath}`);
                await element.setInputFiles(downloadedResumePath);
              } else {
                 log('Warning: AI requested file upload but no resume is linked to the persona.');
              }
            }
            
            madeProgress = true;
            // Small delay between actions
            await page.waitForTimeout(500);

          } catch (actionErr) {
            log(`Warning: Failed to execute action ${action.action} on ${action.selector}. Error: ${actionErr.message}`);
          }
        }
        
        if (!madeProgress) {
           log('Failed to execute any planned actions in this loop. Stopping to prevent infinite loop.');
           break;
        }

        // Wait for page transition / next step
        await page.waitForTimeout(3000);
      }

      if (loopCount >= MAX_LOOPS) {
        log('Reached maximum loop count. Application might have failed or got stuck.');
        return { success: false, logs };
      }

      return { success: true, logs };

    } catch (error) {
      log(`Error during Generic Career Site Apply: ${error.message}`);
      this.logger.error('Generic Apply Error', error);
      return { success: false, logs };
    } finally {
      if (page) {
        await this.playwrightService.closePage(page);
      }
      // Cleanup downloaded resume
      if (downloadedResumePath) {
         try {
            await fs.unlink(downloadedResumePath);
            this.logger.log(`Cleaned up temp resume file: ${downloadedResumePath}`);
         } catch(e) {
            this.logger.error(`Failed to clean up temp resume file: ${downloadedResumePath}`, e);
         }
      }
    }
  }
}
