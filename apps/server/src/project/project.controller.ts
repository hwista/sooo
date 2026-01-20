import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectService } from './project.service';
import { success, paginated, notFound, deleted } from '../common';
import type {
  CreateProjectDto,
  UpdateProjectDto,
  PaginationParams,
} from '@ssoo/types';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async findAll(@Query() params: PaginationParams) {
    const { data, total } = await this.projectService.findAll(params);
    return paginated(data, params.page || 1, params.limit || 10, total);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const project = await this.projectService.findOne(BigInt(id));
    if (!project) {
      return notFound('프로젝트');
    }
    return success(project);
  }

  @Post()
  async create(@Body() dto: CreateProjectDto) {
    const project = await this.projectService.create(dto);
    return success(project);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const project = await this.projectService.update(BigInt(id), dto);
    if (!project) {
      return notFound('프로젝트');
    }
    return success(project);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.projectService.remove(BigInt(id));
    return deleted(result);
  }
}
