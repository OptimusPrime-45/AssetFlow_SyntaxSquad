import { prisma } from '@/lib/prisma';

const PREFIX = 'EMP-';
const PAD = 4;

type Tx = Pick<typeof prisma, 'employee'>;

/**
 * Next sequential employee code: EMP-0001, EMP-0002, ...
 *
 * Codes are zero-padded to a fixed width so a lexicographic `desc` sort is also
 * a numeric sort — that's what lets us find the highest one with a single query.
 * Past EMP-9999 the padding grows and that assumption would break, but the code
 * stays unique because the caller retries on the DB's unique constraint.
 */
export async function nextEmployeeCode(client: Tx = prisma): Promise<string> {
    const last = await client.employee.findFirst({
        where: { employeeCode: { startsWith: PREFIX } },
        orderBy: { employeeCode: 'desc' },
        select: { employeeCode: true },
    });

    const lastNumber = last ? Number.parseInt(last.employeeCode.slice(PREFIX.length), 10) : 0;
    const next = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;

    return `${PREFIX}${String(next).padStart(PAD, '0')}`;
}

/**
 * Runs `fn` with a freshly generated code, retrying if a concurrent signup
 * claimed the same one. The unique index on employeeCode is the real guard;
 * this just turns the resulting race into a retry instead of a 500.
 */
export async function withEmployeeCode<T>(
    fn: (code: string) => Promise<T>,
    attempts = 5,
): Promise<T> {
    for (let attempt = 1; ; attempt++) {
        const code = await nextEmployeeCode();
        try {
            return await fn(code);
        } catch (error) {
            const isDuplicateCode =
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                (error as { code?: string }).code === 'P2002' &&
                JSON.stringify((error as { meta?: unknown }).meta ?? '').includes('employeeCode');

            if (!isDuplicateCode || attempt >= attempts) throw error;
        }
    }
}
