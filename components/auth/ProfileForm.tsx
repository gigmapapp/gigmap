"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AuthAnnouncer, AuthField, AuthSubmit } from "@/components/auth/AuthControls";
import { authSecondaryButtonClass } from "@/components/auth/AuthFrame";
import { profileFieldErrors } from "@/components/auth/messages";
import {
  PROFILE_ALREADY_EXISTS_MESSAGE,
  PROFILE_VALIDATION_SUMMARY,
  type ProfileActionResult,
  type ProfileField,
  type ProfileFieldErrors,
} from "@/lib/auth/result";

const FIELDS = ["name", "category", "city", "genres", "bio"] as const;

export type ProfileFormDefaults = {
  name: string;
  category: string;
  bio: string;
  city: string;
  genres: string;
};

/** Onboarding and edit fields. The server action attaches the signed-in user id. */
export default function ProfileForm({
  action,
  next,
  defaults,
  submitLabel = "Save profile",
  cancelHref,
}: {
  action: (formData: FormData) => Promise<ProfileActionResult>;
  next: string;
  defaults?: ProfileFormDefaults;
  submitLabel?: string;
  cancelHref?: string;
}) {
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [announceKey, setAnnounceKey] = useState(0);
  const formErrorRef = useRef<HTMLParagraphElement | null>(null);
  const focusFormError = useRef(false);

  useEffect(() => {
    if (!focusFormError.current) return;
    focusFormError.current = false;
    formErrorRef.current?.focus();
  }, [announceKey, formError]);

  function clearField(name: ProfileField) {
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function showErrors(fields: ProfileFieldErrors, nextFormError: string | null, form: HTMLFormElement) {
    setFieldErrors(fields);
    setFormError(nextFormError);
    const summary = [nextFormError, ...FIELDS.map((name) => fields[name])]
      .filter((message): message is string => Boolean(message))
      .join(" ");
    setAnnouncement(summary);
    setAnnounceKey((key) => key + 1);
    const first = FIELDS.find((name) => fields[name]);
    if (first) {
      form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    focusFormError.current = Boolean(nextFormError);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const errors = profileFieldErrors(formData);
    if (Object.keys(errors).length > 0) {
      showErrors(errors, PROFILE_VALIDATION_SUMMARY, form);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setPending(true);
    void (async () => {
      try {
        const result = await action(formData);
        if (!result.ok) {
          const formMessage =
            result.formError ?? (Object.keys(result.fieldErrors).length > 0 ? null : result.message);
          showErrors(result.fieldErrors, formMessage, form);
        }
      } catch (err) {
        unstable_rethrow(err);
        const message = err instanceof Error ? err.message : "Could not save profile.";
        showErrors({}, message, form);
      } finally {
        setPending(false);
      }
    })();
  }

  return (
    <form
      action={action as unknown as (formData: FormData) => Promise<void>}
      onSubmit={onSubmit}
      className="space-y-4"
      noValidate
    >
      <AuthAnnouncer message={announcement} announceKey={announceKey} />
      <input type="hidden" name="next" value={next} />
      {formError ? (
        <p
          ref={formErrorRef}
          tabIndex={-1}
          role="alert"
          className="auth-form-error rounded-lg border px-3 py-3 text-sm outline-none"
        >
          {formError}
          {formError === PROFILE_ALREADY_EXISTS_MESSAGE ? (
            <>
              {" "}
              <Link href="/account" className="font-medium text-accent underline-offset-4 hover:underline">
                Go to your account
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      <AuthField
        label="Name"
        name="name"
        required
        autoComplete="nickname"
        placeholder="Stage or band name"
        defaultValue={defaults?.name}
        error={fieldErrors.name}
        onChange={() => clearField("name")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField
          label="Category"
          name="category"
          defaultValue={defaults?.category ?? "solo"}
          options={[
            { value: "solo", label: "Solo" },
            { value: "band", label: "Band" },
            { value: "dj", label: "DJ" },
          ]}
          error={fieldErrors.category}
          onChange={() => clearField("category")}
        />
        <AuthField
          label="City"
          name="city"
          required
          autoComplete="address-level2"
          placeholder="Mystic, CT"
          defaultValue={defaults?.city}
          error={fieldErrors.city}
          onChange={() => clearField("city")}
        />
      </div>
      <AuthField
        label="Genres"
        name="genres"
        placeholder="house, disco"
        hint="Separate with commas."
        defaultValue={defaults?.genres}
        error={fieldErrors.genres}
        onChange={() => clearField("genres")}
      />
      <AuthField
        label="Bio"
        name="bio"
        multiline
        rows={4}
        placeholder="What you play, and the rooms you play it in."
        defaultValue={defaults?.bio}
        error={fieldErrors.bio}
        onChange={() => clearField("bio")}
      />
      <AuthSubmit pending={pending} idle={submitLabel} busy="Saving…" />
      {cancelHref ? (
        <Link href={cancelHref} className={authSecondaryButtonClass}>
          Cancel
        </Link>
      ) : null}
    </form>
  );
}
