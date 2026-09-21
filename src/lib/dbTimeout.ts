/**
 * Database Query Timeout Wrapper
 * Prevents unresolvable DNS or network hangs from exceeding SLA by enforcing a strict timeout.
 */

export async function withDbTimeout<T>(promise: PromiseLike<T>, ms = 50): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('DB Timeout')), ms);
  });
  return Promise.race([Promise.resolve(promise), timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}
