/** Result returned by Server Actions to the forms that call them. */
export type ActionState = {
  ok?: boolean;
  /** Translation key in the "errors" namespace. */
  error?: string;
  /** Field name → translation key in the "errors" namespace. */
  fieldErrors?: Record<string, string>;
  /** Submitted values, used to refill the form after a validation error. */
  values?: Record<string, string>;
} | null;
