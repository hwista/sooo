import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ProjectService } from './project.service';
import type {
  CreateProjectDto,
  UpdateProjectDto,
  PaginationParams,
} from '@ssoo/types';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async findAll(@Query() params: PaginationParams) {
    const { data, total } = await this.projectService.findAll(params);
    return {
      success: true,
      data,
      meta: {
        page: params.page || 1,
        limit: params.limit || 10,
        total,
      },
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const project = await this.projectService.findOne(BigInt(id));
    if (!project) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      };
    }
    return { success: true, data: project };
  }

  @Post()
  async create(@Body() dto: CreateProjectDto) {
    const project = await this.projectService.create(dto);
    return { success: true, data: project };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const project = await this.projectService.update(BigInt(id), dto);
    if (!project) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      };
    }
    return { success: true, data: project };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const deleted = await this.projectService.remove(BigInt(id));
    return { success: true, data: { deleted } };
  }
}
