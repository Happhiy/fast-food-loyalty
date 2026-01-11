import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { customerAPI, purchaseAPI, couponAPI, handleAPIError, Customer, Purchase } from '@/lib/api';
import { getAuth } from '@/lib/storage';
import { ShoppingBag, TrendingUp, Ticket, Loader2 } from 'lucide-react';
import CustomerLayout from '@/components/CustomerLayout';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function CustomerHome() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const auth = getAuth();
  const navigate = useNavigate();

  const loadData = async () => {
    if (!auth) {
      navigate('/');
      return;
    }

    try {
      setIsLoading(true);

      // Fetch customer data
      const customerData = await customerAPI.getById(auth.id);
      setCustomer(customerData);

      // Fetch purchase history
      const purchaseData = await purchaseAPI.getByCustomerId(auth.id);
      setPurchases(purchaseData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (error) {
      console.error('❌ Error loading customer data:', error);
      toast.error(handleAPIError(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRedeemCoupon = async () => {
    if (!auth || !customer) return;

    if (customer.points < 100) {
      toast.error('Nincs elég pontod a kupon beváltásához (100 pont szükséges)');
      return;
    }

    try {
      setIsRedeeming(true);
      const coupon = await couponAPI.create(auth.id);
      toast.success(`Kupon sikeresen beváltva! Kód: ${coupon.code}`);
      
      // Reload data to update points
      await loadData();
      
      // Navigate to coupons page to show the new coupon
      setTimeout(() => {
        navigate('/coupons');
      }, 1500);
    } catch (error) {
      console.error('❌ Error redeeming coupon:', error);
      toast.error(handleAPIError(error));
    } finally {
      setIsRedeeming(false);
    }
  };

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Adatok betöltése...</span>
        </div>
      </CustomerLayout>
    );
  }

  if (!customer) {
    return (
      <CustomerLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">Nem sikerült betölteni az adatokat</p>
          <Button onClick={loadData} className="mt-4">
            Újrapróbálás
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const points = customer.points;
  const visits = customer.visitCount;
  const progressPercentage = Math.min((points / 100) * 100, 100);
  const canRedeemCoupon = points >= 100;

  return (
    <CustomerLayout>
      <div className="space-y-6">
        {/* Points Progress Card */}
        <Card className="bg-gradient-to-br from-red-50 to-amber-50 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-red-700">Pontok összege</span>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {points} / 100
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progressPercentage} className="h-3" />
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {canRedeemCoupon ? '🎉 Gratulálunk! Beválthatod a kuponodat!' : `Még ${100 - points} pont a kuponhoz`}
              </p>
              {canRedeemCoupon && (
                <Button onClick={handleRedeemCoupon} disabled={isRedeeming} className="bg-amber-600 hover:bg-amber-700">
                  {isRedeeming ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Beváltás...
                    </>
                  ) : (
                    <>
                      <Ticket className="w-4 h-4 mr-2" />
                      Kupon beváltása
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Összes látogatás</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{visits}</div>
              <p className="text-xs text-gray-500 mt-1">Köszönjük a hűségedet!</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Összes vásárlás</CardTitle>
              <ShoppingBag className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{purchases.length}</div>
              <p className="text-xs text-gray-500 mt-1">
                {purchases.length > 0
                  ? `Utolsó: ${new Date(purchases[0].timestamp).toLocaleDateString('hu-HU')}`
                  : 'Még nincs vásárlás'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Purchases */}
        <Card>
          <CardHeader>
            <CardTitle>Legutóbbi vásárlások</CardTitle>
          </CardHeader>
          <CardContent>
            {purchases.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Még nincs vásárlás</p>
            ) : (
              <div className="space-y-3">
                {purchases.slice(0, 5).map((purchase) => (
                  <div key={purchase.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{purchase.amount.toLocaleString()} Ft</p>
                      <p className="text-sm text-gray-500">
                        {new Date(purchase.timestamp).toLocaleDateString('hu-HU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      +{purchase.pointsEarned} pont
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}