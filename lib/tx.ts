import type { prisma } from '@/lib/prisma';

/** The client handed to a `prisma.$transaction(async (tx) => ...)` callback. */
export type Tx = Omit<
    typeof prisma,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;
