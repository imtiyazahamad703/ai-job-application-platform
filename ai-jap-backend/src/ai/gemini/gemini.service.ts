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

      const response = await this.ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
      });

      const text = response.text || '{}';
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
}
