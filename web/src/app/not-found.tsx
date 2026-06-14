import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
      <h1 className="text-6xl font-black tracking-tighter text-white">404</h1>
      <p className="text-white/40 text-lg font-medium">Page not found</p>
      <Link
        href="/"
        className="text-[color:var(--lime)] text-sm font-black uppercase tracking-widest hover:underline mt-4"
      >
        Go home
      </Link>
    </div>
  );
}
