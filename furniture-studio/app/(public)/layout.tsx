import { FavoritesProvider } from '@/components/favorites/FavoritesProvider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <FavoritesProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
        <Footer className="pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0" />
        <MobileBottomNav />
      </div>
    </FavoritesProvider>
  );
}
