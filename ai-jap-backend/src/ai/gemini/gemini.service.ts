import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private primaryAi: GoogleGenAI | null = null;
  private fallbackAi: GoogleGenAI | null = null;

  constructor(private readonly configService: ConfigService) {
    const primaryKey = this.configService.get<string>('GEMINI_PRIMARY_API_KEY');
    const fallbackKey = this.configService.get<string>('GEMINI_FALLBACK_API_KEY') || this.configService.get<string>('GEMINI_API_KEY');
    
    if (primaryKey) {
      this.primaryAi = new GoogleGenAI({ apiKey: primaryKey });
    } else {
      this.logger.warn('GEMINI_PRIMARY_API_KEY is not set.');
    }

    if (fallbackKey) {
      this.fallbackAi = new GoogleGenAI({ apiKey: fallbackKey });
    }
  }

  private get ai(): GoogleGenAI | null {
    return this.primaryAi || this.fallbackAi;
  }

  async evaluateJobSemantically(
    jobDescription: string,
    personaSummary: string,
    mandatoryTech: string[],
    preferredTech: string[]
  ): Promise<{ score: number, reason: string }> {
    if (!this.ai) {
      return { score: 50, reason: 'AI disabled, assuming borderline pass.' }; // Default fail open
    }

    try {
      const prompt = `
You are an expert technical recruiter AI evaluating a job description against a candidate's profile.

Candidate Profile Summary:
${personaSummary || 'Experienced Software Engineer'}

The candidate's mandatory technologies: ${mandatoryTech.join(', ')}
The candidate's preferred technologies: ${preferredTech.join(', ')}

Job Description:
${jobDescription.substring(0, 5000)} // Truncated to save tokens if massive

Task:
Evaluate how well the nature and context of this job aligns with the candidate's profile and tech stack.
Are they an AI backend engineer, but the job is purely Python data science? Score it low.
Does the job focus heavily on their preferred stack in the right context? Score it high.

Return a JSON object strictly following this structure (NO MARKDOWN, NO OTHER TEXT):
{
  "score": number, // 0 to 100 based on semantic fit
  "reason": string // 1-2 sentence explanation of why it fits or doesn't fit
}
`;

      let response;
      try {
        response = await this.primaryAi?.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: prompt,
        });
        if (!response) throw new Error('Primary AI not available');
      } catch (err) {
        this.logger.warn('Primary AI failed, trying fallback...');
        response = await this.fallbackAi?.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: prompt,
        });
      }

      const text = response?.text || '{}';
      const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanedText);

      return {
        score: result.score || 0,
        reason: result.reason || 'No reasoning provided.'
      };
    } catch (error) {
      this.logger.error('Failed to evaluate job with Gemini', error);
      return { score: 50, reason: 'AI evaluation failed.' };
    }
  }

  async generatePersonaFromText(resumeText: string, targetRole?: string): Promise<any> {
    if (!this.ai) {
      throw new Error('AI is disabled. Cannot generate persona.');
    }

    try {
      const targetInstruction = targetRole 
        ? `\nCRITICAL TARGET ROLE: The candidate has requested this persona to specifically target the "${targetRole}" role/stack. 
You must prioritize technologies, frameworks, and skills relevant to "${targetRole}" and place them in 'mandatoryTech'. 
If the resume contains other completely unrelated stacks, place them in 'preferredTech' or omit them to keep the persona focused.`
        : `\nIf the resume contains multiple mixed stacks (e.g., MERN and Java), put the most prominent/experienced stack in 'mandatoryTech' and the secondary stack in 'preferredTech'.`;

      const prompt = `
You are an expert technical recruiter AI.
Analyze the following parsed resume text and extract the candidate's core technologies, preferred technologies, and desired job titles.
Also, write a professional "aiRoleSummary" (2-3 sentences) summarizing their expertise, years of experience, and domain.
${targetInstruction}

Organize the extracted technologies into these categories:
- programmingLanguages
- backendFrameworks
- frontendFrameworks
- databases
- cloud
- devOps
- aiLlm

Rules:
1. ONLY return a valid JSON object matching the requested schema. No markdown wrapping.
2. Put their strongest/core skills for the target role in mandatoryTech.
3. Put their secondary/familiar skills in preferredTech.
4. Provide up to 5 desired job titles that fit their profile.

Resume Text:
${resumeText.substring(0, 10000)} // Truncated to save tokens if massive

Return a JSON object strictly following this structure:
{
  "personaName": string,
  "aiRoleSummary": string,
  "desiredJobTitles": string[],
  "mandatoryTech": {
    "programmingLanguages": string[],
    "backendFrameworks": string[],
    "frontendFrameworks": string[],
    "databases": string[],
    "cloud": string[],
    "devOps": string[],
    "aiLlm": string[]
  },
  "preferredTech": {
    "programmingLanguages": string[],
    "backendFrameworks": string[],
    "frontendFrameworks": string[],
    "databases": string[],
    "cloud": string[],
    "devOps": string[],
    "aiLlm": string[]
  }
}
`;

      let response;
      try {
        response = await this.primaryAi?.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: prompt,
        });
        if (!response) throw new Error('Primary AI not available');
      } catch (err) {
        this.logger.warn('Primary AI failed, trying fallback...');
        response = await this.fallbackAi?.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: prompt,
        });
      }

      const text = response?.text || '{}';
      const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanedText);
    } catch (error) {
      this.logger.error('Failed to generate persona with Gemini', error);
      throw error;
    }
  }

  async generateJson(prompt: string, model: string = 'gemini-1.5-flash'): Promise<any> {
    if (!this.ai) {
      throw new Error('AI is disabled. Cannot generate JSON content.');
    }

    try {
      let response;
      try {
        response = await this.primaryAi?.models.generateContent({
          model,
          contents: prompt,
        });
        if (!response) throw new Error('Primary AI not available');
      } catch (err) {
        this.logger.warn('Primary AI failed, trying fallback...');
        response = await this.fallbackAi?.models.generateContent({
          model,
          contents: prompt,
        });
      }

      const text = response?.text || '{}';
      const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanedText);
    } catch (error) {
      this.logger.error('Failed to generate JSON with Gemini', error);
      throw error;
    }
  }
}
