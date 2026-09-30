import { authButtonClass, authFieldClass } from "@/components/auth/AuthFrame";

/** Onboarding fields only. The server action attaches the signed-in user id. */
export default function ProfileForm({
  action,
  next,
}: {
  action: (formData: FormData) => Promise<void>;
  next: string;
}) {
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm text-zinc-300">
        Name
        <input
          name="name"
          required
          placeholder="Stage or band name"
          className={authFieldClass}
        />
      </label>
      <label className="block text-sm text-zinc-300">
        Category
        <select name="category" defaultValue="solo" className={authFieldClass}>
          <option value="solo">Solo</option>
          <option value="band">Band</option>
          <option value="dj">DJ</option>
        </select>
      </label>
      <label className="block text-sm text-zinc-300">
        City
        <input name="city" defaultValue="Austin, TX" className={authFieldClass} />
      </label>
      <label className="block text-sm text-zinc-300">
        Genres
        <input name="genres" placeholder="house, disco" className={authFieldClass} />
      </label>
      <label className="block text-sm text-zinc-300">
        Bio
        <textarea name="bio" rows={4} className={authFieldClass} />
      </label>
      <button type="submit" className={authButtonClass}>
        Save profile
      </button>
    </form>
  );
}
