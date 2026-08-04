import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../../ai/gemini/gemini.service';

export interface ActionPlan {
  action: 'click' | 'type' | 'select' | 'check' | 'uncheck' | 'upload';
  selector: string;
  value?: string;
  reasoning: string;
}

@Injectable()
export class FormFillerService {
  private readonly logger = new Logger(FormFillerService.name);

  constructor(private readonly geminiService: GeminiService) {}

  /**
   * Evaluates the DOM and candidate data to generate a sequence of actions.
   */
  async planActions(
    condensedDom: string, 
    userProfile: any, 
    persona: any
  ): Promise<ActionPlan[]> {
    const prompt = `
You are an autonomous Browser Automation AI acting on behalf of a job seeker.
Your task is to analyze the provided condensed HTML DOM of a job application form and determine the exact sequence of actions needed to fill it out and proceed to the next step.

--- CANDIDATE DATA ---
Profile Data (Basic Info, Contact, Education, Experience):
${JSON.stringify(userProfile, null, 2)}

Target Persona (Skills & Preferences):
${JSON.stringify(persona, null, 2)}

--- CURRENT PAGE DOM ---
${condensedDom}

--- INSTRUCTIONS ---
1. Analyze the DOM to identify form fields (inputs, selects, textareas, checkboxes) and buttons (Next, Continue, Submit).
2. Map the candidate data to the required fields. 
   - If a field asks for Years of Experience with a specific technology, check the Persona's Tech Stack and Profile. If unsure, default to 3 or 4 based on general experience.
   - If a field asks for Salary Expectations, default to "Competitive".
   - If a field requires Yes/No for sponsorship, use the Profile data.
3. Formulate an array of actions to execute in order.
4. The final action should ALWAYS be clicking the primary button to advance the form (e.g., Next, Review, or Submit).

Supported actions:
- 'type': For text inputs. Requires 'selector' and 'value'.
- 'select': For dropdowns. Requires 'selector' and 'value'.
- 'click': For buttons or links. Requires 'selector'.
- 'check' / 'uncheck': For checkboxes/radios. Requires 'selector'.
- 'upload': For file inputs (Resume). Requires 'selector'.

Rules for selectors:
- Use unique identifiers like id, name, or aria-label (e.g., 'input[id="firstName"]', 'button[aria-label="Continue"]').
- Be as specific as possible to avoid clicking the wrong element.

Output MUST be a strictly valid JSON array of objects following this schema (NO MARKDOWN WRAPPING):
[
  {
    "action": "type" | "select" | "click" | "check" | "uncheck" | "upload",
    "selector": "string",
    "value": "string (optional)",
    "reasoning": "Brief explanation of why this action/value was chosen"
  }
]
`;

    try {
      this.logger.log('Sending DOM to Gemini for action planning...');
      const actionPlan = await this.geminiService.generateJson(prompt, 'gemini-1.5-flash');
      
      if (!Array.isArray(actionPlan)) {
        throw new Error('AI did not return an array of actions');
      }

      this.logger.log(`Received ${actionPlan.length} actions from Gemini.`);
      return actionPlan;
    } catch (error) {
      this.logger.error('Failed to plan actions via Gemini', error);
      throw error;
    }
  }
}
