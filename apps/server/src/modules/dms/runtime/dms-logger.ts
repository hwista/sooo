import { Logger } from '@nestjs/common';
import { redactSecretsInText, redactSecretsInValue } from '../../../common/security/secret-redaction.js';

function stringifyContext(context: unknown): string {
  if (context === undefined) {
    return '';
  }

  try {
    return ` ${JSON.stringify(redactSecretsInValue(context))}`;
  } catch {
    return '';
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return redactSecretsInText(error.message);
  }

  return redactSecretsInText(String(error));
}

export function createDmsLogger(context: string) {
  const logger = new Logger(context);

  return {
    debug(message: string, meta?: unknown) {
      logger.debug(`${redactSecretsInText(message)}${stringifyContext(meta)}`);
    },
    info(message: string, meta?: unknown) {
      logger.log(`${redactSecretsInText(message)}${stringifyContext(meta)}`);
    },
    warn(message: string, meta?: unknown) {
      logger.warn(`${redactSecretsInText(message)}${stringifyContext(meta)}`);
    },
    error(message: string, error?: unknown, meta?: unknown) {
      const errorSuffix = error === undefined ? '' : ` | Error: ${toErrorMessage(error)}`;
      logger.error(`${redactSecretsInText(message)}${errorSuffix}${stringifyContext(meta)}`);
    },
  };
}
