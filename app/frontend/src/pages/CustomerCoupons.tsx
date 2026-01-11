import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { couponAPI, handleAPIError, Coupon } from '@/lib/api';
import { getAuth } from '@/lib/storage';
import { Ticket, CheckCircle, Loader2 } from 'lucide-react';
import CustomerLayout from '@/components/CustomerLayout';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function CustomerCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const auth = getAuth();
  const navigate = useNavigate();

  const loadData = async () => {
    if (!auth) {
      navigate('/');
      return;
    }

    try {
      setIsLoading(true);
      const customerCoupons = await couponAPI.getByCustomerId(auth.id);
      setCoupons(customerCoupons.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('❌ Error loading coupons:', error);
      toast.error(handleAPIError(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Kuponok betöltése...</span>
        </div>
      </CustomerLayout>
    );
  }

  const availableCoupons = coupons.filter((c) => !c.redeemed);
  const redeemedCoupons = coupons.filter((c) => c.redeemed);

  return (
    <CustomerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Kuponjaim</h1>
          <Badge variant="secondary" className="text-base px-3 py-1">
            {availableCoupons.length} elérhető
          </Badge>
        </div>

        <Tabs defaultValue="available" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="available">Felhasználható ({availableCoupons.length})</TabsTrigger>
            <TabsTrigger value="redeemed">Beváltva ({redeemedCoupons.length})</TabsTrigger>
          </TabsList>

          {/* Available Coupons */}
          <TabsContent value="available">
            {availableCoupons.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-gray-500">
                    <Ticket className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>Még nincs elérhető kuponod</p>
                    <p className="text-sm mt-1">Gyűjts 100 pontot és válts be egy kupont!</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {availableCoupons.map((coupon) => (
                  <Card
                    key={coupon.id}
                    className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50"
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="text-amber-700 flex items-center">
                          <Ticket className="w-5 h-5 mr-2" />
                          {coupon.value.toLocaleString()} Ft kupon
                        </span>
                        <Badge className="bg-green-600">Aktív</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="bg-white p-4 rounded-lg border-2 border-dashed border-amber-300">
                        <p className="text-xs text-gray-600 mb-1">Kupon kód:</p>
                        <p className="text-2xl font-bold font-mono text-center text-gray-900 tracking-wider">
                          {coupon.code}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Létrehozva:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(coupon.createdAt).toLocaleDateString('hu-HU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                        <p className="text-xs text-blue-800">
                          💡 <strong>Használat:</strong> Mutasd meg ezt a kódot a pénztárnál a kupon felhasználásához.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Redeemed Coupons */}
          <TabsContent value="redeemed">
            {redeemedCoupons.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>Még nincs beváltott kuponod</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {redeemedCoupons.map((coupon) => (
                  <Card key={coupon.id} className="border-gray-200 bg-gray-50 opacity-75">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="text-gray-600 flex items-center">
                          <Ticket className="w-5 h-5 mr-2" />
                          {coupon.value.toLocaleString()} Ft kupon
                        </span>
                        <Badge variant="secondary" className="bg-gray-300 text-gray-700">
                          Beváltva
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="bg-white p-4 rounded-lg border border-gray-300">
                        <p className="text-xs text-gray-500 mb-1">Kupon kód:</p>
                        <p className="text-xl font-bold font-mono text-center text-gray-500 tracking-wider">
                          {coupon.code}
                        </p>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Létrehozva:</span>
                          <span className="text-gray-700">{new Date(coupon.createdAt).toLocaleDateString('hu-HU')}</span>
                        </div>
                        {coupon.redeemedAt && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Beváltva:</span>
                            <span className="text-gray-700">
                              {new Date(coupon.redeemedAt).toLocaleDateString('hu-HU')}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </CustomerLayout>
  );
}