import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, NotFoundException } from "@nestjs/common";
import { ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/auth/guards/roles.guard";
import { ProjectService } from "./project.service";
import { success, paginated, deleted } from "../../../common";
import type {
  CreateProjectDto,
  UpdateProjectDto,
  PaginationParams,
} from "@ssoo/types";
import { ProjectDto, ProjectListDto } from "./dto/project.dto";
import { ApiError } from "../../../common/swagger/api-response.dto";

@ApiTags("projects")
@ApiBearerAuth()
@Controller("projects")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @ApiOperation({ summary: "프로젝트 목록" })
  @ApiOkResponse({ type: ProjectListDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  async findAll(@Query() params: PaginationParams) {
    const { data, total } = await this.projectService.findAll(params);
    return paginated(data, params.page || 1, params.limit || 10, total);
  }

  @Get(":id")
  @ApiOperation({ summary: "프로젝트 상세" })
  @ApiOkResponse({ type: ProjectDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  async findOne(@Param("id") id: string) {
    const project = await this.projectService.findOne(BigInt(id));
    if (!project) {
      throw new NotFoundException("프로젝트를 찾을 수 없습니다.");
    }
    return success(project);
  }

  @Post()
  @ApiOperation({ summary: "프로젝트 생성" })
  @ApiOkResponse({ type: ProjectDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  async create(@Body() dto: CreateProjectDto) {
    const project = await this.projectService.create(dto);
    return success(project);
  }

  @Put(":id")
  @ApiOperation({ summary: "프로젝트 수정" })
  @ApiOkResponse({ type: ProjectDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const project = await this.projectService.update(BigInt(id), dto);
    if (!project) {
      throw new NotFoundException("프로젝트를 찾을 수 없습니다.");
    }
    return success(project);
  }

  @Delete(":id")
  @ApiOperation({ summary: "프로젝트 삭제" })
  @ApiOkResponse({ description: "프로젝트 삭제" })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  async remove(@Param("id") id: string) {
    const result = await this.projectService.remove(BigInt(id));
    return deleted(result);
  }
}