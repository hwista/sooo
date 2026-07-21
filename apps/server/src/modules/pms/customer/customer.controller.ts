import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { CustomerService } from './customer.service.js';
import { success, paginated } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import { FindCustomersDto, CustomerDto } from './dto/customer.dto.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
@UseGuards(RolesGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @ApiOperation({ summary: 'PMS 고객사 읽기용 목록' })
  @ApiOkResponse({ type: [CustomerDto] })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findAll(@Query() params: FindCustomersDto) {
    const { data, total, page, limit } = await this.customerService.findAll(params);
    const serialized = data.map((c) => serializeBigInt(c));
    return paginated(serialized as Record<string, unknown>[], page, limit, total);
  }

  @Get(':id')
  @ApiOperation({ summary: 'PMS 고객사 읽기용 상세' })
  @ApiOkResponse({ type: CustomerDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findOne(@Param('id') id: string) {
    const result = await this.customerService.findOne(BigInt(id));
    return success(serializeBigInt(result));
  }

}
