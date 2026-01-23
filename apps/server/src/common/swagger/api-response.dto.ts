export class ApiError {
  success = false as const;
  error!: {
    code: string;
    message: string;
    path?: string;
  };
  timestamp?: string;
}

export class ApiSuccess<T> {
  success = true as const;
  data!: T;
  message?: string;
}
