import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: '현재 비밀번호' })
  @IsString()
  @MaxLength(100)
  currentPassword!: string;

  @ApiProperty({ description: '새 비밀번호' })
  @IsString()
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다' })
  @MaxLength(100, { message: '비밀번호는 100자 이하여야 합니다' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*]).+$/, {
    message: '비밀번호는 영문, 숫자, 특수문자를 각각 1자 이상 포함해야 합니다',
  })
  newPassword!: string;
}
