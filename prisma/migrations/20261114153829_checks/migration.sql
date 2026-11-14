-- Two rules Prisma can't express in schema.prisma. The services check them too;
-- these stop bad rows from any other route (a script, a typo in a migration).

-- A working pattern version always starts on a Sunday (weeks run Sunday to Saturday).
ALTER TABLE "WorkingPattern"
  ADD CONSTRAINT "WorkingPattern_effectiveFrom_is_sunday"
  CHECK (extract(dow from "effectiveFrom") = 0);

-- A booking must not end before it starts. On a single day, "afternoon to morning"
-- (PM -> AM) is backwards too.
ALTER TABLE "Event"
  ADD CONSTRAINT "Event_start_not_after_end"
  CHECK (
    "startDate" < "endDate"
    OR ("startDate" = "endDate" AND NOT ("startHalf" = 'PM' AND "endHalf" = 'AM'))
  );
