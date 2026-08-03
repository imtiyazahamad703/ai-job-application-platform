import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiProperty,
} from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

import { ResumeService } from './resume.service';
import { JwtAuthGuard } from '../authentication/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../authentication/schemas/user.schema';

class UploadResumeBodyDto {
  @ApiProperty({
    description: 'Label for this resume',
    example: 'Frontend Resume',
  })
  @IsString()
  @IsOptional()
  label?: string;
}

@ApiTags('Resume')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a resume (PDF or DOCX, max 5MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        label: { type: 'string', example: 'Frontend Resume' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadResume(
    @CurrentUser() user: UserDocument,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(pdf|msword|wordprocessingml)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: UploadResumeBodyDto,
  ) {
    const resume = await this.resumeService.uploadResume(
      user._id.toString(),
      file,
      body.label ?? file.originalname,
    );
    return { message: 'Resume uploaded successfully', resume };
  }

  @Get()
  @ApiOperation({ summary: 'List all my resumes' })
  async getResumes(@CurrentUser() user: UserDocument) {
    const resumes = await this.resumeService.getUserResumes(
      user._id.toString(),
    );
    return { count: resumes.length, resumes };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific resume' })
  async getResume(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.resumeService.getResume(user._id.toString(), id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a resume' })
  async deleteResume(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
  ) {
    await this.resumeService.deleteResume(user._id.toString(), id);
    return { message: 'Resume deleted successfully' };
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Set resume as default for auto-apply' })
  async setDefault(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    const resume = await this.resumeService.setDefaultResume(
      user._id.toString(),
      id,
    );
    return { message: 'Default resume updated', resume };
  }
}
