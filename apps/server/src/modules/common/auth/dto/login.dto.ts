import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: '아이디를 입력하세요.' })
  @MaxLength(50, { message: '아이디는 50자 이하여야 합니다.' })
  loginId!: string;

  @IsString()
  @IsNotEmpty({ message: '비밀번호를 입력하세요.' })
  @MinLength(4, { message: '비밀번호는 4자 이상이어야 합니다.' })
  @MaxLength(100, { message: '비밀번호는 100자 이하여야 합니다.' })
  password!: string;
}
