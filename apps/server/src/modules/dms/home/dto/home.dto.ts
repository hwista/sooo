import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsString, MaxLength, MinLength } from 'class-validator';
import type {
  DmsAcknowledgeHomeSeenPayload,
  DmsRecordDocumentVisitPayload,
} from '@ssoo/types/dms';

export class RecordDocumentVisitDto implements DmsRecordDocumentVisitPayload {
  @ApiProperty({ description: '성공적으로 연 문서의 DMS 상대 경로' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  path!: string;
}

export class AcknowledgeHomeSeenDto implements DmsAcknowledgeHomeSeenPayload {
  @ApiProperty({ description: '확인한 홈 응답의 generatedAt 값(ISO 8601)' })
  @IsISO8601({ strict: true })
  seenAt!: string;
}
