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
