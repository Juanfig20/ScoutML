import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth'; // CORRECTED IMPORT
import { LogOut, Home, FileText, Users, CreditCard, User, Menu } from 'lucide-react';
import { useState } from 'react';

export const Navbar = () => {
  const { user, logout } = useAuth(); // 'profile' is no longer directly pulled here, 'user' contains it.
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    // navigate('/auth'); // AuthProvider already handles navigation to /auth
  };

  if (!user) return null; // Only render Navbar if user is logged in

  const NavigationItems = () => (
    <>
      <Link to="/dashboard" onClick={() => setIsOpen(false)}>
        <Button variant="ghost" className="flex items-center space-x-2 w-full justify-start">
          <Home className="h-4 w-4" />
          <span>Dashboard</span>
        </Button>
      </Link>
      <Link to="/player-form" onClick={() => setIsOpen(false)}>
        <Button variant="ghost" className="flex items-center space-x-2 w-full justify-start">
          <FileText className="h-4 w-4" />
          <span>Formulario</span>
        </Button>
      </Link>
      <Link to="/my-players" onClick={() => setIsOpen(false)}>
        <Button variant="ghost" className="flex items-center space-x-2 w-full justify-start">
          <Users className="h-4 w-4" />
          <span>Mis Jugadores</span>
        </Button>
      </Link>
      <Link to="/plans" onClick={() => setIsOpen(false)}>
        <Button variant="ghost" className="flex items-center space-x-2 w-full justify-start">
          <CreditCard className="h-4 w-4" />
          <span>Planes</span>
        </Button>
      </Link>
    </>
  );

  return (
    <nav className="bg-card border-b border-border shadow-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <img src="/scout-ml.png" alt="ScoutML logo" className="h-10 w-[135.32px]" />
            </Link>
            
            <div className="hidden md:flex space-x-4">
              <NavigationItems />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="hidden md:flex items-center space-x-4">
              <Link to="/profile">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <User className="h-4 w-4" />
                  <span>Mi Perfil</span>
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar sesión</span>
              </Button>
            </div>

            {/* Mobile menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex flex-col space-y-4 mt-8">
                  <div className="pb-4 border-b border-border">
                    <p className="text-sm font-medium">{user ? `${user.first_name} ${user.last_name}` : user?.email}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  
                  <NavigationItems />
                  
                  <div className="pt-4 border-t border-border space-y-2">
                    <Link to="/profile" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="flex items-center space-x-2 w-full justify-start">
                        <User className="h-4 w-4" />
                        <span>Mi Perfil</span>
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center space-x-2 w-full justify-start"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Cerrar sesión</span>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};