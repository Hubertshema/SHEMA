export class ApiError extends Error {
  constructor(
    public code: string | number,
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication failed or token expired', details?: any) {
    super('AUTHENTICATION_ERROR', message, 401, details);
    this.name = 'AuthenticationError';
  }
}

export class NetworkUnavailableError extends ApiError {
  constructor(message: string = 'Network connection is unavailable') {
    super('NETWORK_UNAVAILABLE', message, 0);
    this.name = 'NetworkUnavailableError';
  }
}

export class BackendUnavailableError extends ApiError {
  constructor(message: string = 'Backend server is unavailable or unresponsive', statusCode: number = 503) {
    super('BACKEND_UNAVAILABLE', message, statusCode);
    this.name = 'BackendUnavailableError';
  }
}

export class UploadSessionExpiredError extends ApiError {
  constructor(message: string = 'Upload session has expired', details?: any) {
    super('UPLOAD_SESSION_EXPIRED', message, 410, details);
    this.name = 'UploadSessionExpiredError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string = 'Validation error', details?: any) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}
