// How a person's name is shown: their preferred first name if they've set one,
// otherwise the first name from SSO (spec §7).

export type PersonName = { firstName: string; preferredName: string | null; surname: string };

export function displayFirstName(person: PersonName): string {
  return person.preferredName || person.firstName;
}

// "Tom Okafor"
export function displayName(person: PersonName): string {
  return `${displayFirstName(person)} ${person.surname}`;
}

// "TO" for Tom Okafor, shown on the user menu's avatar.
export function initialsOf(person: PersonName): string {
  return `${displayFirstName(person).charAt(0)}${person.surname.charAt(0)}`.toUpperCase();
}

const collator = new Intl.Collator("en-GB");

// People are listed by surname, then first name (spec §2.3). Use with Array.sort.
export function compareBySurname(a: PersonName, b: PersonName): number {
  return (
    collator.compare(a.surname, b.surname) ||
    collator.compare(displayFirstName(a), displayFirstName(b))
  );
}
