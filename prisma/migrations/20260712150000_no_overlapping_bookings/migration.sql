-- A resource cannot be booked by two people for overlapping times.
--
-- The application already checks for overlaps, but a check-then-insert has a
-- race: two requests for the same slot can both pass the check and both insert.
-- This constraint closes that window in the database, where it cannot be raced.
--
-- '[)' makes the range half-open — inclusive of the start, exclusive of the end.
-- That is exactly the rule the spec asks for: a booking of 09:00-10:00 does NOT
-- conflict with one of 10:00-11:00, because 10:00 belongs only to the second.
--
-- The WHERE clause keeps cancelled and rejected bookings out of the constraint,
-- so a slot freed by a cancellation can immediately be booked again.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "resource_bookings"
    ADD CONSTRAINT "resource_bookings_no_overlap"
    EXCLUDE USING gist (
        "assetId" WITH =,
        tsrange("startAt", "endAt", '[)') WITH &&
    )
    WHERE ("isDeleted" = false AND "status" NOT IN ('CANCELLED', 'REJECTED'));
