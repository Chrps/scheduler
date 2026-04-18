import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class AppErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    const message = this.extractMessage(error);

    if (message.includes('ResizeObserver loop completed with undelivered notifications')) {
      return;
    }

    console.error(error);
  }

  private extractMessage(error: unknown): string {
    if (error instanceof Error) {
      const causeMessage =
        error.cause && typeof error.cause === 'object' && 'message' in error.cause
          ? (error.cause as { message?: unknown }).message
          : undefined;

      if (typeof causeMessage === 'string' && causeMessage.length > 0) {
        return causeMessage;
      }

      return error.message;
    }

    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      return typeof message === 'string' ? message : '';
    }

    return '';
  }
}
