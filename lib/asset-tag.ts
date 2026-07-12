import { prisma } from '@/lib/prisma';

const PREFIX = 'AF-';
const PAD = 4;

/**
 * Next sequential asset tag: AF-0001, AF-0002, ...
 *
 * Zero-padded to a fixed width so a lexicographic `desc` sort is also a numeric
 * sort, which lets us find the highest tag in one query.
 */
export async function nextAssetTag(): Promise<string> {
    const last = await prisma.asset.findFirst({
        where: { assetTag: { startsWith: PREFIX } },
        orderBy: { assetTag: 'desc' },
        select: { assetTag: true },
    });

    const lastNumber = last ? Number.parseInt(last.assetTag.slice(PREFIX.length), 10) : 0;
    const next = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;

    return `${PREFIX}${String(next).padStart(PAD, '0')}`;
}

/**
 * Runs `fn` with a freshly generated tag, retrying if a concurrent registration
 * claimed the same one. The unique index on assetTag is the real guard; this
 * turns the resulting race into a retry instead of a 500.
 */
export async function withAssetTag<T>(
    fn: (assetTag: string) => Promise<T>,
    attempts = 5,
): Promise<T> {
    for (let attempt = 1; ; attempt++) {
        const tag = await nextAssetTag();
        try {
            return await fn(tag);
        } catch (error) {
            const isDuplicateTag =
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                (error as { code?: string }).code === 'P2002' &&
                JSON.stringify((error as { meta?: unknown }).meta ?? '').includes('assetTag');

            if (!isDuplicateTag || attempt >= attempts) throw error;
        }
    }
}
