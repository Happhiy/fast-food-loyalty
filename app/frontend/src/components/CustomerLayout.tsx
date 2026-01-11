import { useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { clearAuth, getAuth } from '@/lib/storage';
import { LogOut, Home, Ticket } from 'lucide-react';

interface CustomerLayoutProps {
  children: React.ReactNode;
}

export default function CustomerLayout({ children }: CustomerLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();

  useEffect(() => {
    // Auto refresh every 5 minutes
    const interval = setInterval(() => {
      window.location.reload();
    }, 300000); // 300000ms = 5 minutes

    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-amber-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <img 
                src="https://mgx-backend-cdn.metadl.com/generate/images/890507/2026-01-11/97d6bf26-afbb-4102-a740-a74f6cbeb3af.png" 
                alt="Logo" 
                className="w-10 h-10 object-contain"
              />
              <h1 className="text-xl font-bold text-red-600">Hűségprogram</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden sm:inline">
                {auth.user?.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-600 hover:text-red-600"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Kilépés
              </Button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 py-3">
            <Link to="/home">
              <Button
                variant={location.pathname === '/home' ? 'default' : 'ghost'}
                size="sm"
                className={location.pathname === '/home' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                <Home className="w-4 h-4 mr-2" />
                Kezdőlap
              </Button>
            </Link>
            <Link to="/coupons">
              <Button
                variant={location.pathname === '/coupons' ? 'default' : 'ghost'}
                size="sm"
                className={location.pathname === '/coupons' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                <Ticket className="w-4 h-4 mr-2" />
                Kuponok
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}