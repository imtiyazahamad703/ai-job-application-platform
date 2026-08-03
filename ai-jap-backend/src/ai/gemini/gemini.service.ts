import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private ai: GoogleGenAI | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    } else {
      this.logger.warn('GEMINI_API_KEY is not set. Semantic filtering will be disabled.');
    }
  }

  async filterRelevantJobs(
    desiredTitles: string[],
    keywords: string[],
    scrapedJobs: any[]
  ): Promise<any[]> {
    if (!this.ai || scrapedJobs.length === 0) {
      // If AI is not configured or no jobs to filter, return all jobs (fail open)
      return scrapedJobs;
    }

    try {
      this.logger.log(`Evaluating ${scrapedJobs.length} jobs with Gemini...`);

      const prompt = `
You are an expert technical recruiter and AI job filter.
I am a candidate looking for a job.
My desired job titles are: ${desiredTitles.join(', ')}.
My preferred keywords are: ${keywords.join(', ')}.

I will provide you with a JSON list of jobs scraped from the web.
Evaluate each job title and company to determine if it is relevant to my desired titles.
A job is relevant if its title semantically matches the intent of my desired titles. 
For example, if my desired title is "React Developer", a job titled "Frontend Engineer" is relevant, but "Sales Executive" is not.

Return ONLY a JSON array of boolean values corresponding to the relevance of each job in the exact same order.
DO NOT return markdown, DO NOT return explanations, just the JSON array of booleans (e.g. [true, false, true]).

Jobs to evaluate:
${JSON.stringify(scrapedJobs.map((j, i) => ({ index: i, title: j.title, company: j.company })), null, 2)}
`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text || '[]';
      // Clean up potential markdown formatting if the model disobeys
      const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const results: boolean[] = JSON.parse(cleanedText);

      if (results.length !== scrapedJobs.length) {
        this.logger.warn('Gemini returned an mismatched array length. Failing open.');
        return scrapedJobs;
      }

      const relevantJobs = scrapedJobs.filter((_, index) => results[index] === true);
      this.logger.log(`Gemini filtered out ${scrapedJobs.length - relevantJobs.length} irrelevant jobs. Keeping ${relevantJobs.length}.`);
      return relevantJobs;

    } catch (error) {
      this.logger.error('Failed to filter jobs with Gemini', error);
      return scrapedJobs; // Fail open
    }
  }
}
