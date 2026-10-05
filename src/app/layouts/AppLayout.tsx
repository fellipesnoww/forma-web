import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useMatch } from 'react-router-dom'
import {
  Activity,
  Apple,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  History,
  Home,
  LineChart,
  LogOut,
  Menu,
  Plus,
  Settings,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { useAuth } from '@/shared/auth/AuthContext'
import { useForbiddenNotice } from '@/shared/auth/useForbiddenNotice'
import { cn } from '@/shared/lib/cn'

const navItems = [
  { to: '/app', label: 'Início', icon: Home, end: true },
  { to: '/app/sheets', label: 'Planilhas', icon: ClipboardList },
  { to: '/app/diets', label: 'Dietas', icon: Apple },
  { to: '/app/exercises', label: 'Biblioteca', icon: Dumbbell },
  { to: '/app/calendar', label: 'Calendário', icon: CalendarDays },
  { to: '/app/activities', label: 'Atividades', icon: Activity },
  { to: '/app/progress', label: 'Evolução', icon: LineChart },
  { to: '/app/sessions', label: 'Histórico', icon: History },
  { to: '/app/settings', label: 'Configurações', icon: Settings },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Menu principal" className="flex flex-col gap-[3px]">
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex min-h-11 items-center gap-3 rounded-[11px] px-3 py-2.5 text-[14.5px] font-semibold text-ink-300 hover:bg-sidebar-hover',
              isActive && 'bg-primary-500/18 font-bold text-[#8DA8FF] hover:bg-primary-500/18',
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

function SidebarFooter({ onNavigate }: { onNavigate?: () => void }) {
  const { user, profile, logout } = useAuth()
  return (
    <div className="flex items-center gap-2.5 border-t border-sidebar-border pt-3.5">
      <NavLink
        to="/app/profile"
        onClick={onNavigate}
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

function useIsAdmin() {
  const { user } = useAuth()
  return user?.role === 'admin' || user?.role === 'super_user'
}

function AdminLink({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <NavLink
      to="/admin"
      onClick={onNavigate}
      className="mb-2.5 flex min-h-11 items-center gap-3 rounded-[11px] px-3 py-2.5 text-sm font-semibold text-warning-500 hover:bg-sidebar-hover"
    >
      <ShieldCheck size={20} />
      Painel admin
    </NavLink>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2 pt-1">
      <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-primary-500 text-[21px] font-extrabold text-white">
        F
      </div>
      <span className="text-xl font-extrabold tracking-[-0.4px]">Forma</span>
    </div>
  )
}

/** Shared by the desktop sidebar and the mobile drawer — same items, same order (design: "Menu · drawer responsivo"). */
function MenuContent({ onNavigate }: { onNavigate?: () => void }) {
  const isAdmin = useIsAdmin()
  // Design shows the "Criar planilha" shortcut on the dashboard and the sheets list.
  const onHome = useMatch({ path: '/app', end: true })
  const onSheets = useMatch({ path: '/app/sheets', end: true })
  const showCta = !!onHome || !!onSheets

  return (
    <>
      <div className="mt-7">
        <NavLinks onNavigate={onNavigate} />
      </div>
      <div className="min-h-6 flex-1" />
      {showCta && (
        <NavLink
          to="/app/sheets/new"
          onClick={onNavigate}
          className="mb-3 flex h-12 items-center justify-center gap-2 rounded-[13px] bg-[linear-gradient(150deg,#2D5BFF,#4E78FF)] text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(45,91,255,0.35)]"
        >
          <Plus size={18} strokeWidth={2.4} />
          Criar planilha
        </NavLink>
      )}
      {isAdmin && <AdminLink onNavigate={onNavigate} />}
      <SidebarFooter onNavigate={onNavigate} />
    </>
  )
}

export function AppLayout() {
  useForbiddenNotice()
  // Remembers where the drawer was opened: any navigation (a menu tap, Back) closes it.
  const { pathname } = useLocation()
  const [drawerPath, setDrawerPath] = useState<string | null>(null)

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar px-4 py-[22px] text-white md:flex">
        <Brand />
        <MenuContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-surface-muted">
        <MobileHeader onOpenMenu={() => setDrawerPath(pathname)} />
        <main className="flex-1 overflow-y-auto p-4 pb-8 sm:p-5 md:p-7">
          <Outlet />
        </main>
      </div>

      <MobileDrawer open={drawerPath === pathname} onClose={() => setDrawerPath(null)} />
    </div>
  )
}

function MobileHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const isAdmin = useIsAdmin()
  return (
    <header className="sticky top-0 z-30 flex h-[54px] items-center justify-between border-b border-border bg-surface px-2 md:hidden">
      <div className="flex w-24">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Abrir menu"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-700"
        >
          <Menu size={24} />
        </button>
      </div>
      <NavLink to="/app" className="flex items-center gap-2" aria-label="Forma — início">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500 text-base font-extrabold text-white">
          F
        </div>
        <span className="text-[17px] font-extrabold tracking-[-0.4px]">Forma</span>
      </NavLink>
      <div className="flex w-24 items-center justify-end">
        {isAdmin && (
          <NavLink
            to="/admin"
            aria-label="Painel admin"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-warning-600"
          >
            <ShieldCheck size={20} />
          </NavLink>
        )}
        <NavLink to="/app/profile" aria-label="Perfil" className="flex h-11 w-11 items-center justify-center">
          <UserRound size={18} className="box-content rounded-full bg-surface-soft p-[7px] text-ink-400" />
        </NavLink>
      </div>
    </header>
  )
}

/** Left drawer on phones. A modal <dialog>: focus trap, Esc and backdrop close come with it. */
function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label="Menu"
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-0 h-dvh max-h-none w-[min(300px,85vw)] max-w-none bg-sidebar p-0 text-white backdrop:bg-black/45 md:hidden"
    >
      <div className="flex h-full flex-col px-4 py-[22px]">
        <div className="flex items-center justify-between">
          <Brand />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-300 hover:bg-sidebar-hover"
          >
            <X size={20} />
          </button>
        </div>
        <MenuContent onNavigate={onClose} />
      </div>
    </dialog>
  )
}
