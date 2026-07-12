import { timingSafeEqual } from 'node:crypto';

/**
 * Guards the /api/cron/* endpoints, which mutate data and are reachable from the
 * public internet.
 *
 * Fails CLOSED: with no CRON_SECRET configured, every request is refused. The
 * previous `process.env.CRON_SECRET || 'fallback-cron-secret'` meant that an
 * unset variable silently published these endpoints under a secret that was
 * committed to the repo.
 *
 * Header-only. A secret in the query string ends up in access logs, proxy logs,
 * and Referer headers.
 */
export function isAuthorizedCron(request: Request): boolean {
    const expected = process.env.CRON_SECRET;

    if (!expected) {
        console.error('CRON_SECRET is not set — refusing all cron requests.');
        return false;
    }

    const header = request.headers.get('authorization');
    const provided = header?.startsWith('Bearer ')
        ? header.slice('Bearer '.length)
        : request.headers.get('x-cron-secret');

    if (!provided) return false;

    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;

    return timingSafeEqual(a, b);
}
