import { NavLink, Outlet } from 'react-router-dom'
import { Home, Dumbbell, ClipboardList, History, Activity, CalendarDays, LogOut } from 'lucide-react'
import { useAuth } from '@/shared/auth/AuthContext'
import { cn } from '@/shared/lib/cn'

const navItems = [
  { to: '/app', label: 'Início', icon: Home, end: true },
  { to: '/app/exercises', label: 'Biblioteca', icon: Dumbbell },
  { to: '/app/sheets', label: 'Planilhas', icon: ClipboardList },
  { to: '/app/calendar', label: 'Calendário', icon: CalendarDays },
  { to: '/app/sessions', label: 'Histórico', icon: History },
  { to: '/app/activities', label: 'Atividades', icon: Activity },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-ink-300',
              isActive && 'bg-primary-500/20 text-primary-100',
            )
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

function SidebarFooter() {
  const { user, profile, logout } = useAuth()
  return (
    <div className="flex items-center gap-2.5 border-t border-sidebar-border pt-3.5">
      <NavLink
        to="/app/profile"
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 hover:bg-sidebar-hover"
      >
        <div className="h-9 w-9 shrink-0 rounded-full bg-sidebar-hover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{profile?.displayName ?? 'Minha conta'}</p>
          <p className="truncate text-xs text-ink-500">{user?.email}</p>
        </div>
      </NavLink>
      <button
        type="button"
        onClick={() => logout()}
        aria-label="Sair"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-500 hover:bg-sidebar-hover hover:text-white"
      >
        <LogOut size={17} />
      </button>
    </div>
  )
}

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar p-4 text-white md:flex">
        <div className="flex items-center gap-2.5 px-2 pb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 text-lg font-extrabold">
            F
          </div>
          <span className="text-lg font-extrabold tracking-tight">Forma</span>
        </div>
        <NavLinks />
        <div className="flex-1" />
        <SidebarFooter />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-surface-muted">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto p-5 pb-24 md:p-7 md:pb-7">
          <Outlet />
        </main>
        <MobileTabBar />
      </div>
    </div>
  )
}

function MobileHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-white px-4 md:hidden">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500 text-sm font-extrabold text-white">
          F
        </div>
        <span className="text-base font-extrabold">Forma</span>
      </div>
      <NavLink to="/app/profile" aria-label="Perfil" className="flex h-11 w-11 items-center justify-center">
        <div className="h-8 w-8 rounded-full bg-surface-soft" />
      </NavLink>
    </header>
  )
}

function MobileTabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-white md:hidden">
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-bold text-ink-300',
              isActive && 'text-primary-500',
            )
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
