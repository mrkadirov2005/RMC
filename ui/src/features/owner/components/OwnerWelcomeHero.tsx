import { CalendarDays, Sparkles, TrendingUp } from 'lucide-react';
import { useAppSelector } from '@/features/crm/hooks';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export const OwnerWelcomeHero = () => {
  const user = useAppSelector((state) => state.auth.user);
  const name = user?.first_name || user?.username || 'Owner';
  const date = new Intl.DateTimeFormat(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  }).format(new Date());

  return (
    <section className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-800 px-6 py-7 text-white shadow-lg sm:px-8 sm:py-9">
      <div className="relative z-10 max-w-2xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-indigo-50 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          Welcome back
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {getGreeting()}, {name}.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100/75 sm:text-base">
          Your learning centers are ready. Here is a clear view of the people and activity across the platform.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-xs font-medium text-indigo-100/80">
          <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 backdrop-blur">
            <CalendarDays className="h-4 w-4" />{date}
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/15 px-3 py-2 text-emerald-100 backdrop-blur">
            <TrendingUp className="h-4 w-4" />System overview ready
          </span>
        </div>
      </div>

      <div className="pointer-events-none absolute right-8 top-1/2 hidden h-40 w-40 -translate-y-1/2 sm:block">
        <div className="absolute inset-4 animate-[spin_18s_linear_infinite] rounded-full border border-dashed border-white/25" />
        <div className="absolute inset-10 animate-pulse rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur" />
        <div className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.9)]" />
        <div className="absolute bottom-4 right-2 h-2.5 w-2.5 animate-bounce rounded-full bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.8)]" />
        <Sparkles className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 text-white/80" />
      </div>
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 animate-pulse rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-fuchsia-400/15 blur-3xl" />
    </section>
  );
};
