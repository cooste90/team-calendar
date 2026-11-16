import type { FormErrors } from "./form-values";

type Props = { errors: FormErrors; problem: string | null };

// What stopped the save, at the top of the form: the server's message, or the fields to
// fix (each is also shown next to its field).
export function ErrorSummary({ errors, problem }: Props) {
  const messages = Object.values(errors);
  if (!problem && messages.length === 0) return null;

  let text = problem;
  if (!text) {
    const these = messages.length === 1 ? "this" : "these";
    text = `Please fix ${these}: ${messages.join(". ")}.`;
  }
  return (
    <div
      role="alert"
      className="rounded-xl border border-destructive/40 px-3 py-2 text-destructive text-sm"
    >
      {text}
    </div>
  );
}
