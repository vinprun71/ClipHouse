import { BrandMark } from "@/app/BrandMark";

export function AuthShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#070711] px-5 py-10 text-zinc-100">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.22),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(34,211,238,0.15),transparent_40%)]" />
    <section className="glass-panel relative w-full max-w-md p-7 sm:p-9">
      <div className="mb-8 flex justify-center"><BrandMark /></div>
      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-violet-300">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white">{title}</h1>
        <p className="mt-2 text-sm text-zinc-400">{description}</p>
      </div>
      {children}
    </section>
  </main>;
}

export function PasswordField({ label, value, onChange, autoFocus = false, newPassword = false }: { label: string; value: string; onChange: (value: string) => void; autoFocus?: boolean; newPassword?: boolean }) {
  return <label className="block">
    <span className="mb-2 block text-sm font-bold text-zinc-200">{label}</span>
    <input autoComplete={newPassword ? "new-password" : "current-password"} autoFocus={autoFocus} className="input" onChange={(event) => onChange(event.target.value)} required type="password" value={value} />
  </label>;
}

export function ErrorMessage({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-rose-300" role="alert">{children}</p>;
}
