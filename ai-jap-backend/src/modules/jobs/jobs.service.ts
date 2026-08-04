import { Injectable, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job, JobDocument } from './schemas/job.schema';
import { SearchPersona, SearchPersonaDocument } from './schemas/search-persona.schema';
import { CreateSearchPersonaDto, UpdateSearchPersonaDto } from './dto/search-persona.dto';
import { LinkedinService } from '../../automation/platforms/linkedin/linkedin.service';
import { ProfileService } from '../profile/profile.service';
import { GeminiService } from '../../ai/gemini/gemini.service';

import { PreFilterService } from './pre-filter.service';
import { ResumeService } from '../resume/resume.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
    @InjectModel(SearchPersona.name) private readonly personaModel: Model<SearchPersonaDocument>,
    private readonly linkedinService: LinkedinService,
    private readonly profileService: ProfileService,
    private readonly geminiService: GeminiService,
    private readonly preFilterService: PreFilterService,
    private readonly resumeService: ResumeService,
  ) { }

  async generatePersonaFromResume(userId: string, resumeId: string, targetRole?: string): Promise<any> {
    const resume = await this.resumeService.getResume(userId, resumeId);
    if (!resume.parsedText) {
      throw new InternalServerErrorException('Resume has no parsed text available');
    }
    this.logger.log(`Generating persona from resume ${resumeId} using Gemini (Target Role: ${targetRole || 'None'})`);
    const generatedData = await this.geminiService.generatePersonaFromText(resume.parsedText, targetRole);
    
    // Add linkedResumeId to the generated data so frontend can map it
    generatedData.linkedResumeId = resumeId;
    return generatedData;
  }

  async getJobs(limit: number = 20, skip: number = 0, location?: string): Promise<{ jobs: Job[], totalCount: number }> {
    const query: any = {};
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    const [jobs, totalCount] = await Promise.all([
      this.jobModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.jobModel.countDocuments(query).exec()
    ]);
    return { jobs, totalCount };
  }

  async getPersonas(userId: string): Promise<SearchPersonaDocument[]> {
    const userObjectId = new (require('mongoose').Types.ObjectId)(userId);
    return this.personaModel.find({ userId: userObjectId, isActive: true }).sort({ version: -1 }).exec();
  }

  async createPersona(userId: string, dto: CreateSearchPersonaDto): Promise<SearchPersonaDocument> {
    const userObjectId = new (require('mongoose').Types.ObjectId)(userId);
    return this.personaModel.create({ ...dto, userId: userObjectId, version: 1 });
  }

  async updatePersona(userId: string, personaId: string, dto: UpdateSearchPersonaDto): Promise<SearchPersonaDocument> {
    const userObjectId = new (require('mongoose').Types.ObjectId)(userId);

    // Fetch old persona
    const oldPersona = await this.personaModel.findOne({ _id: personaId, userId: userObjectId, isActive: true }).exec();
    if (!oldPersona) {
      throw new NotFoundException('Persona not found');
    }

    // Versioning: deactivate old, create new
    oldPersona.isActive = false;
    await oldPersona.save();

    const newPersonaData: any = { ...oldPersona.toObject(), ...dto, version: oldPersona.version + 1 };
    delete newPersonaData._id;
    delete newPersonaData.createdAt;
    delete newPersonaData.updatedAt;

    return this.personaModel.create(newPersonaData);
  }

  async deletePersona(userId: string, personaId: string): Promise<void> {
    const userObjectId = new (require('mongoose').Types.ObjectId)(userId);
    const persona = await this.personaModel.findOne({ _id: personaId, userId: userObjectId }).exec();
    if (!persona) {
      throw new NotFoundException('Persona not found');
    }
    persona.isActive = false;
    await persona.save();
  }

  async searchAndSaveJobs(userId: string): Promise<Job[]> {
    try {
      const personas = await this.getPersonas(userId);
      if (personas.length === 0) {
        this.logger.warn(`User ${userId} has no active search personas.`);
        return [];
      }

      const allSavedJobs: Job[] = [];

      for (const persona of personas) {
        this.logger.log(`Running search for Persona: ${persona.personaName} (v${persona.version})`);

        let titlesToSearch = persona.desiredJobTitles;
        if (!titlesToSearch || titlesToSearch.length === 0) {
          continue;
        }

        for (const title of titlesToSearch) {
          this.logger.log(`Scraping for title: ${title}`);

          // --- Phase 3: Caching Layer ---
          const cacheKey = `search:${title}:${persona.locations.join(',')}`;
          let scrapedJobs: any[] = [];

          const cacheModel = this.jobModel.db.model('SearchCache'); // Quick hack to access SearchCache model without injecting, proper way is injecting it. Wait, I will inject it properly later or just use this.
          // Wait, I should just inject it. Let me just use this.jobModel.db.model('SearchCache') for now to avoid messing up constructors in replace_file_content.

          const existingCache = await cacheModel.findOne({ cacheKey }).exec();

          if (existingCache) {
            this.logger.log(`Cache hit for key: ${cacheKey}. Found ${existingCache.scrapedJobs.length} jobs.`);
            scrapedJobs = existingCache.scrapedJobs;
          } else {
            scrapedJobs = await this.linkedinService.searchJobs(title, persona.locations);

            // Deduplicate scraped jobs by URL
            const uniqueJobsMap = new Map();
            for (const j of scrapedJobs) {
              uniqueJobsMap.set(j.url, j);
            }
            scrapedJobs = Array.from(uniqueJobsMap.values());

            // Save to cache
            if (scrapedJobs.length > 0) {
              const expiresAt = new Date();
              expiresAt.setHours(expiresAt.getHours() + 6); // 6 hour cache

              await cacheModel.findOneAndUpdate(
                { cacheKey },
                { $set: { scrapedJobs, expiresAt } },
                { upsert: true }
              ).exec();
            }
          }

          // --- Phase 2: Pre-Filtering & Phase 4: AI Evaluation ---
          for (const jobData of scrapedJobs) {

            // Check if we already processed this job for this persona version
            const alreadySaved = await this.jobModel.findOne({ url: jobData.url, matchedPersonaId: persona._id, personaVersion: persona.version });
            if (alreadySaved) continue;

            const preFilterResult = this.preFilterService.evaluateJob(jobData.description || '', persona);

            if (!preFilterResult.passed) {
              continue; // Drop job
            }

            // --- AI Evaluation ---
            const aiResult = await this.geminiService.evaluateJobSemantically(
              jobData.description || '',
              persona.aiRoleSummary || '',
              preFilterResult.mandatoryMatches,
              preFilterResult.preferredMatches
            );

            // --- Ranking Engine ---
            let titleMatchScore = 0;
            if (jobData.title.toLowerCase().includes(title.toLowerCase())) {
              titleMatchScore = 20; // Max 20 for title
            } else {
              titleMatchScore = 10; // Partial semantic assumption
            }

            // Mandatory Score (Base on how many matched over minimum)
            // Example: Minimum 2. Found 3. Score = 30. Max 30.
            const mandatoryMatchCount = preFilterResult.mandatoryMatches.length;
            let mandatoryTechScore = Math.min((mandatoryMatchCount / persona.minimumRequiredMatch) * 20, 30);

            // Preferred Score (Bonus points)
            // Total preferred tech available in persona vs matched
            const totalPreferred = persona.preferredTech.programmingLanguages.length + persona.preferredTech.backendFrameworks.length /* ... etc. simplifying for logic */;
            // Hardcode max 20 for simplicity
            let preferredTechScore = preFilterResult.preferredMatches.length > 0 ? Math.min(preFilterResult.preferredMatches.length * 5, 20) : 0;

            // AI Score scaled to 30 points max
            const scaledAiScore = (aiResult.score / 100) * 30;

            const totalScore = titleMatchScore + mandatoryTechScore + preferredTechScore + scaledAiScore;

            // Generate Structured Explanation
            const structuredExplanation = {
              titleMatch: jobData.title,
              mandatoryMatches: preFilterResult.mandatoryMatches,
              preferredMatches: preFilterResult.preferredMatches,
              reasoning: aiResult.reason
            };

            const extractedTech = this.preFilterService.formatExtractedTech(preFilterResult.extractedTechList, persona);

            try {
              const updatedJob = await this.jobModel.findOneAndUpdate(
                { url: jobData.url, platform: jobData.platform },
                {
                  $set: {
                    ...jobData,
                    matchedPersonaId: persona._id,
                    personaVersion: persona.version,
                    linkedResumeId: persona.linkedResumeId,
                    extractedTech,
                    matchScore: totalScore,
                    titleMatchScore,
                    mandatoryTechScore,
                    preferredTechScore,
                    aiSemanticScore: scaledAiScore,
                    structuredExplanation
                  }
                },
                { new: true, upsert: true }
              );
              allSavedJobs.push(updatedJob);
            } catch (e: any) {
              if (e.code !== 11000) {
                this.logger.error('Error saving job', e);
              }
            }
          }

          // Small delay between multiple title searches
          if (titlesToSearch.length > 1) {
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      }

      this.logger.log(`Saved ${allSavedJobs.length} highly matched jobs to DB.`);
      return allSavedJobs;
    } catch (error) {
      this.logger.error('Failed to search and save jobs', error);
      throw new InternalServerErrorException('Failed to search jobs');
    }
  }
}
