import { Module } from '@nestjs/common';
import { MenuModule } from './menu/menu.module';
import { ProjectModule } from './project/project.module';

@Module({
  imports: [MenuModule, ProjectModule],
  exports: [MenuModule, ProjectModule],
})
export class PmsModule {}
