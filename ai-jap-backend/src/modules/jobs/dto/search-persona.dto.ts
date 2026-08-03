import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsOptional, IsNumber, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class TechCategoryDto {
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  programmingLanguages?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  backendFrameworks?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  frontendFrameworks?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  databases?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  cloud?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  devOps?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  aiLlm?: string[];
}

export class CreateSearchPersonaDto {
  @ApiProperty()
  @IsString()
  personaName: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  linkedResumeId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  desiredJobTitles?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  locations?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  workMode?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  jobType?: string[];

  @ApiPropertyOptional()
  @ValidateNested()
  @Type(() => TechCategoryDto)
  @IsOptional()
  mandatoryTech?: TechCategoryDto;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  minimumRequiredMatch?: number;

  @ApiPropertyOptional()
  @ValidateNested()
  @Type(() => TechCategoryDto)
  @IsOptional()
  preferredTech?: TechCategoryDto;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludedTech?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludedKeywords?: string[];
}

export class UpdateSearchPersonaDto extends CreateSearchPersonaDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
