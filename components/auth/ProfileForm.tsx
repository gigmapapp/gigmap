"use client";

import { unstable_rethrow } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthAnnouncer, AuthField, AuthSubmit } from "@/components/auth/AuthControls";
import { profileFieldErrors } from "@/components/auth/messages";

const FIELDS = ["name", "category", "city", "genres", "bio"] as const;

/** Onboarding fields only. The server action attaches the signed-in user id. */
export default function ProfileForm({
  action,
  next,
}: {
  action: (formData: FormData) => Promise<void>;
  next: string;
}) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [announceKey, setAnnounceKey] = useState(0);

  function clearField(name: string) {
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const errors = profileFieldErrors(formData);
    if (errors.form || Object.keys(errors).length > 0) {
      const { form: nextForm, ...fields } = errors;
      setFormError(nextForm ?? null);
      setFieldErrors(fields);
      const summary = [nextForm, ...FIELDS.map((name) => fields[name])]
        .filter((message): message is string => Boolean(message))
        .join(" ");
      setAnnouncement(summary);
      setAnnounceKey((key) => key + 1);
      const first = FIELDS.find((name) => fields[name]);
      if (first) {
        form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      }
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setPending(true);
    void (async () => {
      try {
        await action(formData);
      } catch (err) {
        unstable_rethrow(err);
        const message = err instanceof Error ? err.message : "Could not save profile.";
        setFormError(message);
        setAnnouncement(message);
        setAnnounceKey((key) => key + 1);
      } finally {
        setPending(false);
      }
    })();
  }

  return (
    <form action={action} onSubmit={onSubmit} className="space-y-4" noValidate>
      <AuthAnnouncer message={announcement} announceKey={announceKey} />
      <input type="hidden" name="next" value={next} />
      {formError ? (
        <p tabIndex={-1} role="alert" className="auth-form-error rounded-lg border px-3 py-3 text-sm outline-none">
          {formError}
        </p>
      ) : null}
      <AuthField
        label="Name"
        name="name"
        required
        autoComplete="nickname"
        placeholder="Stage or band name"
        error={fieldErrors.name}
        onChange={() => clearField("name")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField
          label="Category"
          name="category"
          defaultValue="solo"
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
          autoComplete="address-level2"
          defaultValue="Austin, TX"
          error={fieldErrors.city}
          onChange={() => clearField("city")}
        />
      </div>
      <AuthField
        label="Genres"
        name="genres"
        placeholder="house, disco"
        hint="Separate with commas."
        error={fieldErrors.genres}
        onChange={() => clearField("genres")}
      />
      <AuthField
        label="Bio"
        name="bio"
        multiline
        rows={4}
        placeholder="What you play, and the rooms you play it in."
        error={fieldErrors.bio}
        onChange={() => clearField("bio")}
      />
      <AuthSubmit pending={pending} idle="Save profile" busy="Saving…" />
    </form>
  );
}
