import { Injectable, Logger } from '@nestjs/common';
import { SearchPersonaDocument } from './schemas/search-persona.schema';
import { extractTechnologies } from './utils/tech-dictionary.util';
import { JobTechExtraction } from './schemas/job.schema';

export interface PreFilterResult {
  passed: boolean;
  extractedTechList: string[];
  reason?: string;
  mandatoryMatches: string[];
  preferredMatches: string[];
}

@Injectable()
export class PreFilterService {
  private readonly logger = new Logger(PreFilterService.name);

  /**
   * Runs deterministic rule-based filtering on a job description.
   * Returns whether the job passed, the extracted technologies, and match details.
   */
  evaluateJob(description: string, persona: SearchPersonaDocument): PreFilterResult {
    if (!description) {
      return { passed: false, extractedTechList: [], reason: 'No description provided', mandatoryMatches: [], preferredMatches: [] };
    }

    const extractedTechList = extractTechnologies(description);
    
    // 1. Exclusion Check
    const excludedOverlaps = extractedTechList.filter(tech => persona.excludedTech.includes(tech));
    if (excludedOverlaps.length > 0) {
      this.logger.debug(`Job rejected due to excluded tech: ${excludedOverlaps.join(', ')}`);
      return { passed: false, extractedTechList, reason: `Contains excluded tech: ${excludedOverlaps.join(', ')}`, mandatoryMatches: [], preferredMatches: [] };
    }
    
    const lowerDesc = description.toLowerCase();
    for (const kw of persona.excludedKeywords) {
      if (lowerDesc.includes(kw.toLowerCase())) {
        this.logger.debug(`Job rejected due to excluded keyword: ${kw}`);
        return { passed: false, extractedTechList, reason: `Contains excluded keyword: ${kw}`, mandatoryMatches: [], preferredMatches: [] };
      }
    }

    // 2. Mandatory Tech Check
    const mandatoryTechSet = new Set([
      ...persona.mandatoryTech.programmingLanguages,
      ...persona.mandatoryTech.backendFrameworks,
      ...persona.mandatoryTech.frontendFrameworks,
      ...persona.mandatoryTech.databases,
      ...persona.mandatoryTech.cloud,
      ...persona.mandatoryTech.devOps,
      ...persona.mandatoryTech.aiLlm,
    ]);

    const mandatoryMatches = extractedTechList.filter(tech => mandatoryTechSet.has(tech));
    
    if (mandatoryMatches.length < persona.minimumRequiredMatch) {
      this.logger.debug(`Job rejected. Expected ${persona.minimumRequiredMatch} mandatory matches, found ${mandatoryMatches.length}.`);
      return { 
        passed: false, 
        extractedTechList, 
        reason: `Did not meet minimum mandatory tech match. Found: ${mandatoryMatches.length}/${persona.minimumRequiredMatch}`,
        mandatoryMatches,
        preferredMatches: []
      };
    }

    // 3. Extract Preferred Tech Matches
    const preferredTechSet = new Set([
      ...persona.preferredTech.programmingLanguages,
      ...persona.preferredTech.backendFrameworks,
      ...persona.preferredTech.frontendFrameworks,
      ...persona.preferredTech.databases,
      ...persona.preferredTech.cloud,
      ...persona.preferredTech.devOps,
      ...persona.preferredTech.aiLlm,
    ]);

    const preferredMatches = extractedTechList.filter(tech => preferredTechSet.has(tech));

    return {
      passed: true,
      extractedTechList,
      mandatoryMatches,
      preferredMatches
    };
  }

  /**
   * Formats the extracted tech list into the categorized schema structure.
   */
  formatExtractedTech(extractedTechList: string[], persona: SearchPersonaDocument): JobTechExtraction {
    // Basic mapping back to categories based on where they appear in the persona
    // For simplicity, we just put them all where they belong in the persona, 
    // or leave them un-categorized if we don't have a reverse lookup right now.
    // In a real system, TECH_DICTIONARY would hold the category of each tech.
    // For MVP, we will construct it by checking against persona categories.

    const result = new JobTechExtraction();
    
    const categorize = (techs: string[], source: string[]) => techs.filter(t => source.includes(t));

    result.programmingLanguages = categorize(extractedTechList, [...persona.mandatoryTech.programmingLanguages, ...persona.preferredTech.programmingLanguages]);
    result.backendFrameworks = categorize(extractedTechList, [...persona.mandatoryTech.backendFrameworks, ...persona.preferredTech.backendFrameworks]);
    result.frontendFrameworks = categorize(extractedTechList, [...persona.mandatoryTech.frontendFrameworks, ...persona.preferredTech.frontendFrameworks]);
    result.databases = categorize(extractedTechList, [...persona.mandatoryTech.databases, ...persona.preferredTech.databases]);
    result.cloud = categorize(extractedTechList, [...persona.mandatoryTech.cloud, ...persona.preferredTech.cloud]);
    result.devOps = categorize(extractedTechList, [...persona.mandatoryTech.devOps, ...persona.preferredTech.devOps]);
    result.aiLlm = categorize(extractedTechList, [...persona.mandatoryTech.aiLlm, ...persona.preferredTech.aiLlm]);

    return result;
  }
}
