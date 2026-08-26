import { applyDecorators, type Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ApiPaginationMeta, ApiSuccess } from './api-response.dto.js';

interface ApiContractResponseOptions {
  description?: string;
}

const successProperty = {
  type: 'boolean' as const,
  enum: [true],
  example: true,
};

export function ApiOkEnvelopeResponse(
  model: Type<unknown>,
  options: ApiContractResponseOptions = {},
) {
  return applyDecorators(
    ApiExtraModels(ApiSuccess, model),
    ApiOkResponse({
      description: options.description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiSuccess) },
          {
            type: 'object',
            required: ['success', 'data'],
            properties: {
              success: successProperty,
              data: { $ref: getSchemaPath(model) },
            },
          },
        ],
      },
    }),
  );
}

export function ApiOkPaginatedResponse(
  model: Type<unknown>,
  options: ApiContractResponseOptions = {},
) {
  return applyDecorators(
    ApiExtraModels(ApiPaginationMeta, model),
    ApiOkResponse({
      description: options.description,
      schema: {
        type: 'object',
        required: ['success', 'data', 'meta'],
        properties: {
          success: successProperty,
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(model) },
          },
          meta: { $ref: getSchemaPath(ApiPaginationMeta) },
        },
      },
    }),
  );
}

export function ApiOkObjectResponse(
  options: ApiContractResponseOptions = {},
) {
  return ApiOkResponse({
    description: options.description,
    schema: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: successProperty,
        data: {
          type: 'object',
          additionalProperties: true,
        },
        message: { type: 'string' },
      },
    },
  });
}
