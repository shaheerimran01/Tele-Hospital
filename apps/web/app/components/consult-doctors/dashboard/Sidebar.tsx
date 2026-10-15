'use client';

import {
  CalendarDays,
  Clock,
  Hospital,
  LayoutDashboard,
  Lock,
  LogOut,
  Stethoscope,
  UserRound,
  Users,
  Video,
  Wallet,
  X,
} from 'lucide-react';

export type DashboardView =
  | 'dashboard'
  | 'patients'
  | 'appointments'
  | 'availability'
  | 'earnings'
  | 'personal'
  | 'clinics'
  | 'online';

type NavItem = { id: DashboardView; label: string; Icon: typeof Clock };

/** Views that stay locked until the admin approves the doctor's account. */
export const LOCKED_VIEWS: ReadonlySet<DashboardView> = new Set<DashboardView>([
  'patients',
  'appointments',
  'availability',
  'earnings',
  'online',
]);

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Manage',
    items: [
      { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
      { id: 'patients', label: 'Patients', Icon: Users },
      { id: 'appointments', label: 'Appointments', Icon: CalendarDays },
      { id: 'availability', label: 'Availability', Icon: Clock },
      { id: 'earnings', label: 'Earnings', Icon: Wallet },
    ],
  },
  {
    title: 'My profile',
    items: [
      { id: 'personal', label: 'Personal Info', Icon: UserRound },
      { id: 'clinics', label: 'Clinics Info', Icon: Hospital },
      { id: 'online', label: 'Online Consultations', Icon: Video },
    ],
  },
];

interface SidebarProps {
  active: DashboardView;
  onNavigate: (view: DashboardView) => void;
  /** badge shown next to "Appointments" */
  pendingCount: number;
  doctorName: string;
  doctorSubtitle: string;
  onSignOut: () => void;
  /** mobile drawer */
  open: boolean;
  onClose: () => void;
  /** account not approved yet: restricted links are disabled */
  locked?: boolean;
}

function SidebarBody({
  active,
  onNavigate,
  pendingCount,
  doctorName,
  doctorSubtitle,
  onSignOut,
  onClose,
  showClose,
  locked = false,
}: Omit<SidebarProps, 'open'> & { showClose: boolean }) {
  return (
    <div className="flex h-full flex-col bg-[#141b34] text-white">
      {/* Brand */}
      <div className="flex items-center justify-between gap-2 px-5 pb-6 pt-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b38a3a] text-white">
            <Stethoscope className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-tight">Tabibistan</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#d8c08c]">Doctor Portal</p>
          </div>
        </div>
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-7 overflow-y-auto px-3" aria-label="Doctor portal">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
              {section.title}
            </p>
            <ul className="space-y-1">
              {section.items.map(({ id, label, Icon }) => {
                const isActive = id === active;
                const isLocked = locked && LOCKED_VIEWS.has(id);
                if (isLocked) {
                  return (
                    <li key={id} className="cursor-not-allowed" title="Available after your account is verified">
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        tabIndex={-1}
                        className="pointer-events-none flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-white/70 opacity-50"
                      >
                        <Icon className="h-[18px] w-[18px]" />
                        <span className="flex-1">{label}</span>
                        <Lock className="h-3.5 w-3.5" aria-label="Locked" />
                      </button>
                    </li>
                  );
                }
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate(id);
                        onClose();
                      }}
                      aria-current={isActive ? 'page' : undefined}
                      className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                        isActive
                          ? 'bg-white/10 font-semibold text-white'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-[#d8b25e]" aria-hidden />
                      )}
                      <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-[#d8b25e]' : ''}`} />
                      <span className="flex-1">{label}</span>
                      {id === 'appointments' && pendingCount > 0 && (
                        <span
                          className="min-w-[22px] rounded-full bg-[#e8453b] px-1.5 py-0.5 text-center text-[11px] font-bold text-white"
                          aria-label={`${pendingCount} pending`}
                        >
                          {pendingCount}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Signed-in doctor */}
      <div className="border-t border-white/10 px-4 py-4">
        <p className="truncate text-sm font-semibold">{doctorName}</p>
        <p className="truncate text-xs text-white/55">{doctorSubtitle}</p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/85 transition hover:border-white/40 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

export default function Sidebar(props: SidebarProps) {
  const { open, onClose } = props;
  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 lg:block">
        <SidebarBody {...props} showClose={false} />
      </aside>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-50 lg:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
        <div
          className={`absolute inset-0 bg-[#141b34]/50 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-2xl transition-transform duration-200 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <SidebarBody {...props} showClose />
        </aside>
      </div>
    </>
  );
}
