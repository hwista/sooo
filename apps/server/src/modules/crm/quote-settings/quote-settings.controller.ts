import fs from 'fs';
import path from 'path';
import { BadRequestException, Body, Controller, Get, NotFoundException, Post, Put, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiProduces, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Response as ExpressResponse } from 'express';
import { success } from '../../../common/index.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CrmDomainFeatureGuard } from '../access/crm-domain-feature.guard.js';
import { RequireCrmDomainFeature } from '../access/require-crm-domain-feature.decorator.js';
import { CrmQuoteSellerProfileUpsertDto } from './dto/quote-settings.dto.js';
import { QuoteSettingsService } from './quote-settings.service.js';
import { storageAdapterService } from '../../dms/storage/storage-adapter.service.js';
import { getMimeType, IMAGE_ALLOWED_MIME_TYPES } from '../../dms/file/file.constants.js';

interface UploadedCiFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

const CI_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const CiFileInterceptor = FileInterceptor('file', { limits: { fileSize: CI_MAX_SIZE_BYTES } });

@ApiTags('crm-quote-settings')
@ApiBearerAuth()
@Controller('crm/quote-seller-profile')
@UseGuards(RolesGuard, CrmDomainFeatureGuard)
export class QuoteSettingsController {
  constructor(private readonly quoteSettingsService: QuoteSettingsService) {}

  @Get()
  @RequireCrmDomainFeature('canReadQuoteSettings')
  @ApiOperation({ summary: 'CRM 견적서 공급자 표시 정보 조회' })
  @ApiOkResponse({ description: '견적서에 표시할 공급자 회사 정보' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 영업기회 조회 권한 없음' })
  async sellerProfile() {
    return success(await this.quoteSettingsService.getSellerProfile());
  }

  @Get('ci')
  @RequireCrmDomainFeature('canReadQuoteSettings')
  @ApiOperation({ summary: 'CRM 견적/계약 공급자 CI 이미지 조회' })
  @ApiProduces('image/png', 'image/jpeg', 'image/gif', 'image/webp')
  @ApiOkResponse({ description: '검증된 공급자 CI 이미지 binary' })
  async sellerCi(@Res() response: ExpressResponse) {
    const profile = await this.quoteSettingsService.getSellerProfile();
    const storageRef = profile.ciStorageRef?.trim();
    if (profile.ciStatus !== 'configured' || !storageRef) {
      throw new NotFoundException('조회 가능한 공급자 CI 이미지가 없습니다.');
    }

    try {
      const opened = storageAdapterService.open({ storageUri: storageRef });
      const resolved = storageAdapterService.resolveContainedPath(opened.provider, opened.path);
      const mimeType = getMimeType(path.basename(resolved.fullPath));
      const buffer = fs.readFileSync(resolved.fullPath);
      if (!IMAGE_ALLOWED_MIME_TYPES.has(mimeType) || !this.matchesImageSignature(buffer, mimeType)) {
        throw new Error('공급자 CI 저장소 참조가 유효한 이미지 파일을 가리키지 않습니다.');
      }
      response.setHeader('Content-Type', mimeType);
      response.setHeader('Content-Length', String(buffer.length));
      response.setHeader('Cache-Control', 'private, no-store');
      response.setHeader('Content-Disposition', `inline; filename="${path.basename(resolved.fullPath).replace(/["\\]/g, '_')}"`);
      response.send(buffer);
    } catch (error) {
      throw new NotFoundException(error instanceof Error ? error.message : '공급자 CI 이미지를 열 수 없습니다.');
    }
  }

  @Put()
  @RequireCrmDomainFeature('canManageQuoteSettings')
  @ApiOperation({ summary: 'CRM 견적서 공급자 표시 정보 저장' })
  @ApiBody({ type: CrmQuoteSellerProfileUpsertDto })
  @ApiOkResponse({ description: '저장된 견적서 공급자 회사 정보' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 영업기회 수정 권한 없음' })
  async updateSellerProfile(
    @Body() body: CrmQuoteSellerProfileUpsertDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.quoteSettingsService.upsertSellerProfile(body, BigInt(currentUser.userId)));
  }

  @Post('ci')
  @RequireCrmDomainFeature('canManageQuoteSettings')
  @UseInterceptors(CiFileInterceptor)
  @ApiOperation({ summary: '견적/계약 공급자 CI 이미지 업로드' })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ description: '검증된 DMS CI 저장소 참조' })
  async uploadSellerCi(@UploadedFile() file: UploadedCiFile | undefined) {
    if (!file) throw new BadRequestException('CI 이미지 파일이 필요합니다.');
    if (file.size > CI_MAX_SIZE_BYTES) throw new BadRequestException('CI 이미지는 5MB 이하여야 합니다.');
    if (!IMAGE_ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('CI 이미지는 PNG, JPEG, GIF, WEBP 형식만 지원합니다.');
    }
    if (getMimeType(file.originalname) !== file.mimetype || !this.matchesImageSignature(file.buffer, file.mimetype)) {
      throw new BadRequestException('파일 확장자와 실제 이미지 형식이 일치하지 않습니다.');
    }

    try {
      const saved = storageAdapterService.upload({
        fileName: `${Date.now()}-${file.originalname}`,
        content: file.buffer,
        relativePath: 'crm/company-ci',
        origin: 'manual',
        status: 'published',
      });
      return success({
        fileName: file.originalname,
        size: saved.size,
        mimeType: file.mimetype,
        storageRef: saved.storageUri,
        checksum: saved.checksum,
        provider: saved.provider,
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'CI 이미지를 저장하지 못했습니다.');
    }
  }

  private matchesImageSignature(buffer: Buffer, mimeType: string): boolean {
    if (mimeType === 'image/png') {
      return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (mimeType === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (mimeType === 'image/gif') return ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'));
    if (mimeType === 'image/webp') return buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    return false;
  }
}
