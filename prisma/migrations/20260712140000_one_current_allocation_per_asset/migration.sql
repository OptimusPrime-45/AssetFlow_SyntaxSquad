-- An asset can be in exactly one person's hands at a time.
--
-- Prisma's schema language can't express a partial unique index, so this is
-- hand-written. It is the last line of defence behind the application's conflict
-- check: even if a code path forgets to look, or two requests race past the
-- check at the same instant, the database refuses the second row.
--
-- Partial (WHERE "isCurrent" = true) so that the many historical allocations for
-- an asset — all with isCurrent = false — remain perfectly legal.
CREATE UNIQUE INDEX IF NOT EXISTS "asset_allocations_one_current_per_asset"
    ON "asset_allocations" ("assetId")
    WHERE "isCurrent" = true;
