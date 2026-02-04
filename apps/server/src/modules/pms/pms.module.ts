import { Module } from '@nestjs/common';
import { MenuModule } from './menu/menu.module.js';
import { ProjectModule } from './project/project.module.js';

@Module({
  imports: [MenuModule, ProjectModule],
  exports: [MenuModule, ProjectModule],
})
export class PmsModule {}
