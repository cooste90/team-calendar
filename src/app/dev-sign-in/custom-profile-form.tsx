import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signInAsCustomProfile } from "@/server/actions/sign-in";

const fields = [
  { name: "ssoId", label: "SSO ID", type: "text" },
  { name: "employeeNumber", label: "Employee number", type: "text" },
  { name: "firstName", label: "First name", type: "text" },
  { name: "surname", label: "Surname", type: "text" },
  { name: "email", label: "Email", type: "email" },
];

// Sign in as any profile you type in, e.g. to test a new admin group.
export function CustomProfileForm() {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold text-lg">Custom profile</h2>
      <form action={signInAsCustomProfile} className="flex flex-col gap-3">
        {fields.map((field) => (
          <Field key={field.name}>
            <FieldLabel htmlFor={field.name}>{field.label}</FieldLabel>
            <Input id={field.name} name={field.name} type={field.type} required />
          </Field>
        ))}
        <Field>
          <FieldLabel htmlFor="formalGroups">SSO groups</FieldLabel>
          <Input id="formalGroups" name="formalGroups" aria-describedby="formalGroups-help" />
          <FieldDescription id="formalGroups-help">
            Comma-separated, e.g. CALENDAR_ADMIN
          </FieldDescription>
        </Field>
        <Button type="submit" className="self-start">
          Sign in
        </Button>
      </form>
    </section>
  );
}
