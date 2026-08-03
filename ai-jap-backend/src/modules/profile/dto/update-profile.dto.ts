import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsUrl,
  MaxLength,
  Min,
  Max,
  ValidateNested,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

class EducationDto {
  @ApiPropertyOptional() @IsString() degree: string;
  @ApiPropertyOptional() @IsString() institution: string;
  @ApiPropertyOptional() @IsString() @IsOptional() fieldOfStudy?: string;
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(1950)
  @Max(2100)
  startYear?: number;
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(1950)
  @Max(2100)
  endYear?: number;
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isCurrentlyStudying?: boolean;
}

class ExperienceDto {
  @ApiPropertyOptional() @IsString() company: string;
  @ApiPropertyOptional() @IsString() role: string;
  @ApiPropertyOptional() @IsString() @IsOptional() startDate?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() endDate?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isCurrentRole?: boolean;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  technologies?: string[];
}

class ProjectDto {
  @ApiPropertyOptional() @IsString() name: string;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
  @ApiPropertyOptional() @IsUrl() @IsOptional() url?: string;
  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  technologies?: string[];
}

export class UpdateProfileDto {
  @ApiPropertyOptional() @IsString() @IsOptional() firstName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() lastName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(200)
  headline?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() city?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() country?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() currentCompany?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() currentRole?: string;
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @IsPositive()
  totalExperienceYears?: number;
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @IsPositive()
  currentSalary?: number;
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @IsPositive()
  expectedSalary?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() noticePeriod?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferredLocations?: string[];
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  certifications?: string[];
  @ApiPropertyOptional({ type: [EducationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  @IsOptional()
  education?: EducationDto[];
  @ApiPropertyOptional({ type: [ExperienceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  @IsOptional()
  experience?: ExperienceDto[];
  @ApiPropertyOptional({ type: [ProjectDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectDto)
  @IsOptional()
  projects?: ProjectDto[];
  @ApiPropertyOptional() @IsUrl() @IsOptional() linkedinUrl?: string;
  @ApiPropertyOptional() @IsUrl() @IsOptional() githubUrl?: string;
  @ApiPropertyOptional() @IsUrl() @IsOptional() portfolioUrl?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  employmentTypes?: string[];
  @ApiPropertyOptional() @IsBoolean() @IsOptional() openToRemote?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() openToRelocation?: boolean;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  professionalSummary?: string;
}
