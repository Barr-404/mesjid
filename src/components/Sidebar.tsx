import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useCallback, memo } from 'react';
import { 
  LayoutDashboard, 
  Heart, 
  Wallet, 
  Banknote, 
  TrendingDown, 
  Users, 
  Building,
  FileText,
  Menu,
  X,
  Database,
  CalendarHeart,
  Sparkles,
  LogOut,
  HandHeart,
  Coins
} from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  danger?: boolean;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Zakat Fitrah', href: '/zakat-fitrah', icon: Heart },
  { name: 'Zakat Mal', href: '/zakat-mal', icon: Coins },
  { name: 'Donatur Bulanan', href: '/donatur-bulanan', icon: HandHeart },
  { name: 'Tabungan Qurban', href: '/tabungan-qurban', icon: Sparkles },
  { name: 'Kas Harian', href: '/kas-harian', icon: Wallet },
  { name: 'Pengeluaran', href: '/pengeluaran', icon: TrendingDown },
  { name: 'Mustahiq', href: '/mustahiq', icon: Users },
  { name: 'Laporan', href: '/laporan', icon: FileText },
  { name: 'Laporan Tabungan', href: '/laporan/tabungan-qurban', icon: CalendarHeart },
  { name: 'Reset Database', href: '/reset', icon: Database, danger: true },
];

// Optimized navigation item component
const NavigationItem = memo(({ item, pathname, onClick, onNavigate }: { 
  item: NavigationItem; 
  pathname: string; 
  onClick?: () => void;
  onNavigate?: (href: string) => void;
}) => {
  const isActive = pathname === item.href;
  const IconComponent = item.icon;
  const isDanger = item.danger;
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    onClick?.();
    onNavigate?.(item.href);
  }, [onClick, onNavigate, item.href]);
  
  return (
    <Link
      href={item.href}
      onClick={handleClick}
      className={`flex items-center gap-3 px-4 py-4 rounded-xl text-sm font-medium transition-all duration-150 min-h-[44px] touch-manipulation will-change-transform ${
        isActive
          ? isDanger 
            ? 'bg-red-50 text-red-600 shadow-sm border-l-4 border-red-500'
            : 'bg-teal-50 text-teal-700 shadow-sm border-l-4 border-teal-500'
          : isDanger
            ? 'text-red-600 hover:bg-red-50 hover:shadow-sm'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
      }`}
      prefetch={true}
      replace={false}
    >
      <IconComponent className="w-5 h-5 flex-shrink-0" />
      <span className="truncate">{item.name}</span>
      {isActive && !isDanger && (
        <div className="w-2 h-2 bg-teal-400 rounded-full ml-auto" />
      )}
    </Link>
  );
});

NavigationItem.displayName = 'NavigationItem';

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleLogout = useCallback(async () => {
    if (!confirm('Yakin ingin keluar?')) return;
    
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [router]);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);
  
  // Instant navigation handler
  const handleNavigation = useCallback((href: string) => {
    setIsNavigating(true);
    closeMobileMenu();
    // Reset navigation state after transition
    setTimeout(() => setIsNavigating(false), 300);
  }, [closeMobileMenu]);

  const SidebarContent = () => (
    <>
      <div className="relative">
        {/* Header dengan gradient islami */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-4">
          <div className="text-center">
            <h1 className="text-white font-bold text-base leading-tight mb-1">Sistem Administrasi</h1>
            <h2 className="text-white font-bold text-base leading-tight mb-2">Masjid</h2>
            <div className="h-px bg-white/30 my-3" />
            <p className="text-white/70 text-xs italic">Masjid Muhammadiyah</p>
          </div>
        </div>
      </div>
      
      <nav className="mt-6 px-4 flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {navigation.map((item, index) => {
            const showSeparator = index === navigation.length - 1 && item.danger;
            
            return (
              <li key={item.name}>
                {showSeparator && (
                  <div className="border-t border-gray-200 my-6 pt-4">
                    <p className="text-xs font-semibold text-red-400 uppercase tracking-wider px-3 mb-3">
                      🔴 Zona Bahaya
                    </p>
                  </div>
                )}
                <NavigationItem 
                  item={item} 
                  pathname={pathname} 
                  onClick={closeMobileMenu}
                  onNavigate={handleNavigation}
                />
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout Button dengan desain islami */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 p-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-4 rounded-xl text-sm font-medium transition-all duration-200 w-full text-gray-600 hover:bg-red-50 hover:text-red-600 hover:shadow-sm border border-transparent hover:border-red-200 min-h-[44px] touch-manipulation gpu-accelerated"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span>Keluar</span>
          <div className="ml-auto text-xs text-gray-400">⌨ Ctrl+Q</div>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-6 h-6 text-emerald-600" />
            <span className="text-lg font-bold text-gray-900">Zakat Masjid</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-3 rounded-lg text-gray-600 hover:bg-emerald-100 min-h-[44px] min-w-[44px] touch-manipulation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-emerald-50 to-teal-50 shadow-xl transform transition-transform duration-300 ease-in-out ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          <SidebarContent />
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:w-64 lg:bg-gradient-to-b lg:from-emerald-50 lg:to-teal-50 lg:border-r lg:border-emerald-200 lg:flex lg:flex-col">
        <SidebarContent />
      </div>
    </>
  );
};

export default Sidebar;