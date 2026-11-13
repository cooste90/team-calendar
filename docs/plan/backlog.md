# Backlog: future ideas

Ideas for after the current build (T01–T37). **Agents don't build anything from this file.** When the product owner picks an idea, follow "Changing the plan" in `README.md`: spec first, then a new task.

| Idea | Why someone wants it | Size | Notes |
|---|---|---|---|
| **Change history** | Admins can see who created, changed or deleted a booking and when. This settles "I didn't book that" questions and helps spot mistakes. | S–M | Bookings already have audit fields (`createdBy`, `updatedBy`, timestamps), but they only show the latest change. Full history needs a small `BookingChange` table, with one row written inside `saveBookingChanges` (which keeps it in one place) recording who, when, the action and the before/after dates and type. Show it as a "History" section in the event dialog for admins, and perhaps a per-person list in the profile. Decide how long to keep rows (for example 2 years) and whether a USER can see the history of their own bookings. |
