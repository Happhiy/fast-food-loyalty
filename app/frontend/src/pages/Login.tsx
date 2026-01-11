import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authAPI, handleAPIError } from '@/lib/api';
import { setAuth, initializeStorage } from '@/lib/storage';
import { toast } from 'sonner';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
  const [loyaltyId, setLoyaltyId] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    initializeStorage();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!loyaltyId || !pinCode) {
        toast.error('Kérjük töltse ki az összes mezőt');
        setIsLoading(false);
        return;
      }

      // Validate PIN code format (8 digits)
      if (!/^\d{8}$/.test(pinCode.trim())) {
        toast.error('A PIN kód 8 számjegyből kell álljon');
        setIsLoading(false);
        return;
      }

      // Normalize inputs
      const normalizedLoyaltyId = loyaltyId.trim().toUpperCase();
      const normalizedPinCode = pinCode.trim();

      console.log('🔐 Attempting login:', normalizedLoyaltyId);

      // Call backend API
      const response = await authAPI.login(normalizedLoyaltyId, normalizedPinCode);

      console.log('✓ Login successful:', response.user.loyaltyId);

      // Store tokens
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);

      // Store user data
      setAuth(response.user);

      toast.success('Sikeres bejelentkezés!');

      setTimeout(() => {
        if (response.user.role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/home');
        }
      }, 500);
    } catch (error) {
      console.error('❌ Login error:', error);
      const errorMessage = handleAPIError(error);
      toast.error(errorMessage || 'Hibás hűségkártya szám vagy PIN kód');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-amber-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img
              src="https://mgx-backend-cdn.metadl.com/generate/images/890507/2026-01-11/97d6bf26-afbb-4102-a740-a74f6cbeb3af.png"
              alt="Loyalty Points"
              className="w-20 h-20 object-contain"
            />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold text-red-600">Hűségprogram</CardTitle>
          <CardDescription className="text-xs sm:text-base">Jelentkezzen be hűségkártyájával</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loyaltyId" className="text-xs sm:text-sm">
                Hűségkártya szám
              </Label>
              <Input
                id="loyaltyId"
                placeholder="pl. CUST001"
                value={loyaltyId}
                onChange={(e) => setLoyaltyId(e.target.value)}
                className="text-base h-12 touch-manipulation"
                style={{ fontSize: '16px' }}
                autoComplete="username"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pinCode" className="text-xs sm:text-sm">
                8 számjegyű PIN kód
              </Label>
              <Input
                id="pinCode"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                placeholder="12345678"
                value={pinCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setPinCode(value);
                }}
                className="text-base h-12 font-mono tracking-wider touch-manipulation"
                style={{ fontSize: '16px' }}
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-base py-6 min-h-[44px] touch-manipulation"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bejelentkezés...
                </>
              ) : (
                'Bejelentkezés'
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs sm:text-sm text-gray-700">
                <p className="font-semibold mb-1">Bejelentkezési adatok:</p>
                <p>A hűségkártya számot és a 8 számjegyű PIN kódot az admin adja meg regisztrációkor.</p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-xs sm:text-sm text-gray-600 font-semibold mb-2">Demo fiók adatok:</p>
            <div className="space-y-1 text-xs sm:text-sm text-gray-700">
              <p>
                <span className="font-medium">Admin:</span> ADMIN001 / 12345678
              </p>
              <p>
                <span className="font-medium">Vásárló:</span> CUST001 / 11111111
              </p>
              <p>
                <span className="font-medium">Vásárló:</span> CUST002 / 22222222
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}