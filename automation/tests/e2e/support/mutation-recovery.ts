export type CleanupAction = () => Promise<void>;

interface CleanupEntry {
  label: string;
  action: CleanupAction;
}

export class MutationRecovery {
  private readonly entries: CleanupEntry[] = [];

  defer(label: string, action: CleanupAction): void {
    this.entries.push({ label, action });
  }

  async run<T>(action: (recovery: MutationRecovery) => Promise<T>): Promise<T> {
    let result: T | undefined;
    let primaryError: unknown;
    try {
      result = await action(this);
    } catch (error) {
      primaryError = error;
    }

    const cleanupErrors: Error[] = [];
    for (const entry of [...this.entries].reverse()) {
      try {
        await entry.action();
      } catch (error) {
        cleanupErrors.push(new Error(
          `[cleanup:${entry.label}] ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        ));
      }
    }

    if (primaryError !== undefined || cleanupErrors.length > 0) {
      const errors = [
        ...(primaryError === undefined ? [] : [primaryError]),
        ...cleanupErrors,
      ];
      throw new AggregateError(
        errors,
        `mutation proof failed with ${primaryError === undefined ? 0 : 1} primary and ${cleanupErrors.length} cleanup error(s)`,
      );
    }
    return result as T;
  }
}
