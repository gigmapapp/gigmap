"use client";

import { unstable_rethrow } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createBookingAction } from "@/app/actions/bookings";
import {
  bookingFieldsFromForm,
  firstBookingField,
  hasBookingErrors,
  validateBookingFields,
  type BookingField,
  type BookingFieldErrors,
} from "@/lib/booking-validation";
import type { Performer } from "@/lib/types";

const FIELD_ORDER: BookingField[] = [
  "contactName",
  "contactEmail",
  "eventDetails",
  "preferredDate",
  "preferredLocation",
];

export default function BookingForm({ performer }: { performer: Performer }) {
  const formId = useId();
  const [fieldErrors, setFieldErrors] = useState<BookingFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [announceKey, setAnnounceKey] = useState(0);
  const fieldRefs = useRef(new Map<BookingField, HTMLElement>());
  const formErrorRef = useRef<HTMLParagraphElement | null>(null);
  const focusRequest = useRef<BookingField | "form" | null>(null);

  useEffect(() => {
    const target = focusRequest.current;
    if (!target) return;
    focusRequest.current = null;
    if (target === "form") {
      formErrorRef.current?.focus();
      return;
    }
    fieldRefs.current.get(target)?.focus();
  }, [fieldErrors, formError, announceKey]);

  function applyResult(nextFields: BookingFieldErrors, nextFormError: string | null) {
    const summary = [
      nextFormError,
      ...FIELD_ORDER.map((field) => nextFields[field]),
    ]
      .filter((message): message is string => Boolean(message))
      .join(" ");
    const focus = firstBookingField(nextFields);
    focusRequest.current = focus ?? (nextFormError ? "form" : null);
    setFieldErrors(nextFields);
    setFormError(nextFormError);
    setAnnouncement(summary);
    setAnnounceKey((key) => key + 1);
  }

  function clearFieldError(field: BookingField) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        // A form action resets uncontrolled fields when it finishes, including
        // when validation fails. Submit here so a field error leaves the rest intact.
        const formData = new FormData(event.currentTarget);
        const clientErrors = validateBookingFields(bookingFieldsFromForm(formData));
        if (hasBookingErrors(clientErrors)) {
          applyResult(clientErrors, null);
          return;
        }

        setPending(true);
        setFieldErrors({});
        setFormError(null);
        try {
          const result = await createBookingAction(formData);
          if (result && result.ok === false) {
            applyResult(result.fieldErrors, result.formError ?? null);
          }
        } catch (err) {
          unstable_rethrow(err);
          applyResult(
            {},
            err instanceof Error ? err.message : "Could not send request.",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <h2 className="sr-only">Request to book {performer.name}</h2>
      {announcement ? (
        <p key={announceKey} role="alert" className="sr-only">
          {announcement}
        </p>
      ) : null}
      <input type="hidden" name="performerId" value={performer.id} />
      <Field
        formId={formId}
        label="Your name"
        name="contactName"
        required
        autoComplete="name"
        placeholder="Jordan Lee"
        error={fieldErrors.contactName}
        inputRef={(node) => setFieldRef(fieldRefs.current, "contactName", node)}
        onChange={() => clearFieldError("contactName")}
      />
      <Field
        formId={formId}
        label="Email"
        name="contactEmail"
        type="email"
        required
        autoComplete="email"
        placeholder="you@email.com"
        error={fieldErrors.contactEmail}
        inputRef={(node) => setFieldRef(fieldRefs.current, "contactEmail", node)}
        onChange={() => clearFieldError("contactEmail")}
      />
      <Field
        formId={formId}
        label="Event details"
        name="eventDetails"
        required
        multiline
        rows={4}
        placeholder="Private birthday on a backyard deck, 40 guests, 2-hour set..."
        error={fieldErrors.eventDetails}
        inputRef={(node) => setFieldRef(fieldRefs.current, "eventDetails", node)}
        onChange={() => clearFieldError("eventDetails")}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          formId={formId}
          label="Preferred date"
          name="preferredDate"
          type="date"
          required
          error={fieldErrors.preferredDate}
          inputRef={(node) => setFieldRef(fieldRefs.current, "preferredDate", node)}
          onChange={() => clearFieldError("preferredDate")}
        />
        <Field
          formId={formId}
          label="Preferred location"
          name="preferredLocation"
          required
          placeholder="East Austin backyard"
          error={fieldErrors.preferredLocation}
          inputRef={(node) => setFieldRef(fieldRefs.current, "preferredLocation", node)}
          onChange={() => clearFieldError("preferredLocation")}
        />
      </div>
      <Field
        formId={formId}
        label="Message"
        name="message"
        multiline
        rows={3}
        placeholder="Budget range, must-play songs, parking notes..."
      />
      {formError ? (
        <p
          ref={formErrorRef}
          tabIndex={-1}
          role="alert"
          className="booking-form-error rounded-lg border px-3 py-2 text-sm outline-none"
        >
          {formError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-orange-500 py-3 font-medium text-white hover:bg-orange-600 disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Sending..." : "Send request"}
      </button>
    </form>
  );
}

function setFieldRef(
  refs: Map<BookingField, HTMLElement>,
  field: BookingField,
  node: HTMLElement | null,
) {
  if (node) refs.set(field, node);
  else refs.delete(field);
}

function controlClass() {
  return "booking-field mt-1 w-full rounded-lg border bg-zinc-900 px-3 py-2 text-white outline-none";
}

function Field({
  formId,
  label,
  name,
  required,
  placeholder,
  type = "text",
  autoComplete,
  multiline,
  rows,
  error,
  inputRef,
  onChange,
}: {
  formId: string;
  label: string;
  name: BookingField | "message";
  required?: boolean;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  multiline?: boolean;
  rows?: number;
  error?: string;
  inputRef?: (node: HTMLElement | null) => void;
  onChange?: () => void;
}) {
  const id = `${formId}-${name}`;
  const errorId = `${id}-error`;
  const invalid = Boolean(error);
  const describedBy = invalid ? errorId : undefined;
  const shared = {
    id,
    name,
    required,
    placeholder,
    "aria-invalid": invalid || undefined,
    "aria-describedby": describedBy,
    className: controlClass(),
    onChange,
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm text-zinc-300">
        {label}
        {multiline ? (
          <textarea {...shared} ref={inputRef} rows={rows} />
        ) : (
          <input {...shared} ref={inputRef} type={type} autoComplete={autoComplete} />
        )}
      </label>
      {invalid ? (
        <p id={errorId} className="mt-1 text-sm text-accent">
          {error}
        </p>
      ) : null}
    </div>
  );
}
