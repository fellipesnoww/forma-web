import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ChevronLeft, Dumbbell, ListChecks, LogOut, Medal, ShieldCheck, Users } from 'lucide-react'
import { useAuth } from '@/shared/auth/AuthContext'
import { useForbiddenNotice } from '@/shared/auth/useForbiddenNotice'
import { cn } from '@/shared/lib/cn'
import { ROLE_LABEL } from '@/features/admin/lib/format'

const navItems = [
  { to: '/admin/exercises', label: 'Exercícios', icon: Dumbbell, superOnly: false },
  { to: '/admin/users', label: 'Usuários', icon: Users, superOnly: false },
  { to: '/admin/admins', label: 'Administradores', icon: ShieldCheck, superOnly: true },
  { to: '/admin/gamification', label: 'Conquistas e desafios', icon: Medal, superOnly: false },
  { to: '/admin/audit', label: 'Auditoria', icon: ListChecks, superOnly: true },
]

function useNavItems() {
  const { user } = useAuth()
  return navItems.filter((item) => !item.superOnly || user?.role === 'super_user')
}

/** `/admin/*` shell (3.1): dark sidebar on desktop, header + scrollable tabs on mobile. Role guard lives in the router. */
export function AdminLayout() {
  const items = useNavItems()
  const { user, profile, logout } = useAuth()
  useForbiddenNotice()

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar px-4 py-[22px] text-white md:flex">
        <div className="flex items-center gap-2.5 px-2 pt-1">
          <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-primary-500 text-[21px] font-extrabold">
            F
          </div>
          <span className="text-xl font-extrabold tracking-[-0.4px]">Forma</span>
          <span className="ml-auto rounded-[7px] bg-warning-500/15 px-2 py-1 text-[10.5px] font-extrabold tracking-[0.6px] text-warning-500">
            ADMIN
          </span>
        </div>

        <p className="mt-7 px-3 pb-2 text-[11px] font-extrabold tracking-[0.8px] text-ink-600">PAINEL ADMINISTRATIVO</p>
        <nav aria-label="Painel administrativo" className="flex flex-col gap-[3px]">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 rounded-[11px] px-3 py-2.5 text-[14.5px] font-semibold text-ink-300 hover:bg-sidebar-hover',
                  isActive && 'bg-primary-500/20 font-bold text-[#8DA8FF] hover:bg-primary-500/20',
                )
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />
        <NavLink
          to="/app"
          className="mb-2.5 flex min-h-11 items-center gap-3 rounded-[11px] px-3 py-2.5 text-[14.5px] font-semibold text-ink-300 hover:bg-sidebar-hover"
        >
          <ChevronLeft size={20} />
          Voltar ao app
        </NavLink>
        <div className="flex items-center gap-2.5 border-t border-sidebar-border pt-3.5">
          <div className="h-9 w-9 shrink-0 rounded-full border border-sidebar-hover bg-sidebar-hover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-bold">{profile?.displayName ?? user?.email}</p>
            <p className="truncate text-[11.5px] text-ink-500">{user ? ROLE_LABEL[user.role] : ''}</p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            aria-label="Sair"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-500 hover:bg-sidebar-hover hover:text-white"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-surface-muted">
        <MobileHeader items={items} />
        <main className="flex min-h-0 flex-1 flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function MobileHeader({ items }: { items: ReturnType<typeof useNavItems> }) {
  const navRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()

  // Keep the current tab in view: the later tabs start off-screen on a phone.
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [pathname])

  return (
    <div className="sticky top-0 z-30 border-b border-sidebar-border bg-sidebar text-white md:hidden">
      <div className="flex h-14 items-center justify-between px-3">
        <div className="flex items-center gap-2 pl-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500 text-sm font-extrabold">F</div>
          <span className="text-base font-extrabold">Forma</span>
          <span className="rounded-md bg-warning-500/15 px-1.5 py-0.5 text-[10px] font-extrabold tracking-[0.6px] text-warning-500">
            ADMIN
          </span>
        </div>
        <NavLink
          to="/app"
          className="flex h-11 items-center gap-1 rounded-lg px-2.5 text-sm font-semibold text-ink-300"
        >
          <ChevronLeft size={18} />
          App
        </NavLink>
      </div>
      <nav ref={navRef} aria-label="Painel administrativo" className="flex gap-1 overflow-x-auto px-3 pb-2.5">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 shrink-0 items-center gap-2 rounded-[10px] px-3 text-[13px] font-semibold whitespace-nowrap text-ink-300',
                isActive && 'bg-primary-500/20 font-bold text-[#8DA8FF]',
              )
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
