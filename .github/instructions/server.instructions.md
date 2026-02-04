---
applyTo: "apps/server/**"
---

# NestJS 서버 개발 규칙

> 이 규칙은 `apps/server/` 경로의 파일 작업 시 적용됩니다.

---

## 모듈 구조

```
src/
├── app.module.ts              # 루트 모듈
├── main.ts                    # 엔트리 포인트
├── config/                    # 설정 (Joi 검증)
├── database/                  # DatabaseModule (Prisma 연결)
├── common/                    # 공용 유틸 (decorators, guards, filters)
└── modules/
    ├── common/                # 공용 도메인 (auth, user, health)
    │   ├── auth/
    │   ├── user/
    │   └── health/
    └── pms/                   # PMS 도메인
        ├── project/
        ├── menu/
        └── pms.module.ts
```

---

## 모듈 패턴

```typescript
// ✅ 표준: 모듈은 명확한 imports/providers/exports
@Module({
  imports: [DatabaseModule],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
```

---

## Controller 패턴

```typescript
// ✅ 표준: Swagger 데코레이터 필수, 간결한 로직
@Controller('projects')
@ApiTags('Projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @ApiOperation({ summary: '프로젝트 목록 조회' })
  @ApiResponse({ status: 200, description: '성공' })
  async findAll(@Query() query: FindProjectsDto) {
    return this.projectService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '프로젝트 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.projectService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '프로젝트 생성' })
  async create(@Body() dto: CreateProjectDto) {
    return this.projectService.create(dto);
  }
}
```

---

## Service 패턴

```typescript
// ✅ 표준: PrismaService 주입, 비즈니스 로직만 포함
@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FindProjectsDto) {
    const { page = 1, pageSize = 20, ...filters } = query;
    
    return this.prisma.prProjectM.findMany({
      where: this.buildWhereClause(filters),
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.prProjectM.findUnique({
      where: { id: BigInt(id) },
    });
    
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    
    return project;
  }

  async create(dto: CreateProjectDto) {
    return this.prisma.prProjectM.create({
      data: {
        ...dto,
        createdBy: dto.userId,
      },
    });
  }
}
```

---

## DTO 패턴

```typescript
// ✅ 표준: class-validator + Swagger 데코레이터
import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ description: '프로젝트명' })
  @IsString()
  projectName: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '고객사 ID' })
  @IsString()
  @IsOptional()
  customerId?: string;
}

export class FindProjectsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number = 20;
}
```

---

## 인증/인가 패턴

```typescript
// ✅ JwtAuthGuard 사용
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  // ...
}

// ✅ 역할 기반 접근 제어
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  // ...
}

// ✅ 현재 사용자 가져오기
@Get('me')
async getMe(@CurrentUser() user: JwtPayload) {
  return this.userService.findOne(user.sub);
}
```

---

## API 응답 형식

```typescript
// ✅ 성공 응답
{
  "success": true,
  "data": { ... },
  "meta": { "total": 100, "page": 1, "pageSize": 20 }
}

// ✅ 에러 응답
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found"
  }
}
```

---

## BigInt 처리

```typescript
// ✅ API 응답 시 string 변환 필수
// Prisma BigInt → JSON string
const project = await this.prisma.prProjectM.findUnique({ ... });
return {
  ...project,
  id: project.id.toString(),
};
```

---

## 환경 변수 검증 (Joi)

```typescript
// config/config.validation.ts
// ✅ 필수 환경 변수는 Joi로 검증 (미설정 시 부팅 실패)
export const validationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  PORT: Joi.number().default(4000),
});
```

---

## 금지 사항

1. **Controller에서 직접 Prisma 사용** - Service를 통해서만 접근
2. **any 타입 사용** - 구체적 타입 또는 unknown 사용
3. **BaseService 등 불필요한 추상화** - 직접 구현
4. **로직 없는 Service 래퍼** - Controller에서 직접 호출 가능하면 Service 불필요
5. **환경 변수 하드코딩** - ConfigService 사용

---

## 관련 문서

- [api-guide.md](../docs/common/guides/api-guide.md) - API 응답 형식
- [auth-system.md](../docs/common/architecture/auth-system.md) - 인증 시스템
- [security-standards.md](../docs/common/architecture/security-standards.md) - 보안 표준
