import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, NotFoundException } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/auth/guards/roles.guard";
import { ProjectService } from "./project.service";
import { success, paginated, deleted } from "../../../common";
import type {
  CreateProjectDto,
  UpdateProjectDto,
  PaginationParams,
} from "@ssoo/types";

@ApiTags("projects")
@ApiBearerAuth()
@Controller("projects")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @ApiOperation({ summary: "프로젝트 목록" })
  @ApiOkResponse({ description: "프로젝트 목록" })
  async findAll(@Query() params: PaginationParams) {
    const { data, total } = await this.projectService.findAll(params);
    return paginated(data, params.page || 1, params.limit || 10, total);
  }

  @Get(":id")
  @ApiOperation({ summary: "프로젝트 상세" })
  @ApiOkResponse({ description: "프로젝트 상세" })
  async findOne(@Param("id") id: string) {
    const project = await this.projectService.findOne(BigInt(id));
    if (!project) {
      throw new NotFoundException("프로젝트를 찾을 수 없습니다.");
    }
    return success(project);
  }

  @Post()
  @ApiOperation({ summary: "프로젝트 생성" })
  @ApiOkResponse({ description: "프로젝트 생성" })
  async create(@Body() dto: CreateProjectDto) {
    const project = await this.projectService.create(dto);
    return success(project);
  }

  @Put(":id")
  @ApiOperation({ summary: "프로젝트 수정" })
  @ApiOkResponse({ description: "프로젝트 수정" })
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
  async remove(@Param("id") id: string) {
    const result = await this.projectService.remove(BigInt(id));
    return deleted(result);
  }
}