import { z } from "zod";
import { isCountryCode } from "./countries";

// Error messages are translation keys in the "errors" namespace of /messages.

function toNumberOrUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isNaN(number) ? value : number;
}

export const text = (max = 200) =>
  z.string({ error: "required" }).trim().min(1, "required").max(max, "tooLong");

export const optionalText = (max = 1000) =>
  z
    .string()
    .trim()
    .max(max, "tooLong")
    .optional()
    .transform((value) => (value ? value : null));

export const number = (min: number, max: number) =>
  z.preprocess(
    toNumberOrUndefined,
    z.number({ error: "invalidNumber" }).min(min, "invalidNumber").max(max, "invalidNumber"),
  );

export const integer = (min: number, max: number) =>
  z.preprocess(
    toNumberOrUndefined,
    z
      .number({ error: "invalidNumber" })
      .int("invalidNumber")
      .min(min, "invalidNumber")
      .max(max, "invalidNumber"),
  );

export const optionalInteger = (min: number, max: number) =>
  z.preprocess(
    toNumberOrUndefined,
    z
      .number({ error: "invalidNumber" })
      .int("invalidNumber")
      .min(min, "invalidNumber")
      .max(max, "invalidNumber")
      .optional(),
  );

export const optionalNumber = (min: number, max: number) =>
  z.preprocess(
    toNumberOrUndefined,
    z.number({ error: "invalidNumber" }).min(min, "invalidNumber").max(max, "invalidNumber").optional(),
  );

export const country = z.string({ error: "invalidCountry" }).refine(isCountryCode, "invalidCountry");

export const email = z.email({ error: "invalidEmail" }).max(200, "tooLong");

export const password = z.string({ error: "required" }).min(8, "passwordTooShort").max(200, "tooLong");

export function oneOf<T extends readonly [string, ...string[]]>(values: T) {
  return z.enum(values, { error: "invalidValue" });
}

/** String fields of a FormData object (files are ignored). */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/** Drops sensitive or bulky values before they are sent back to the form. */
export function safeValues(values: Record<string, string>): Record<string, string> {
  const { password: _password, ...rest } = values;
  void _password;
  return rest;
}
