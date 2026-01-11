import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  customerAPI,
  purchaseAPI,
  couponAPI,
  authAPI,
  handleAPIError,
  Customer,
  CreateCustomerResponse,
  LookupCouponResponse,
} from '@/lib/api';
import { clearAuth } from '@/lib/storage';
import {
  UserPlus,
  ShoppingCart,
  Ticket,
  LogOut,
  Edit,
  Trash2,
  CheckCircle,
  Copy,
  CheckCheck,
  Eye,
  EyeOff,
  Search,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Admin() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastAddedCustomer, setLastAddedCustomer] = useState<CreateCustomerResponse | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [visiblePins, setVisiblePins] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Coupon lookup states
  const [couponSearchCode, setCouponSearchCode] = useState('');
  const [lookupResult, setLookupResult] = useState<LookupCouponResponse | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const navigate = useNavigate();

  // Form states
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    pinCode: '',
  });

  const [purchaseForm, setPurchaseForm] = useState({
    customer_id: '',
    amount: '',
    receipt_number: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await customerAPI.getAll();
      setCustomers(data.filter((c) => c.role !== 'ADMIN'));
    } catch (error) {
      console.error('❌ Error loading customers:', error);
      toast.error(handleAPIError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const togglePinVisibility = (customerId: string) => {
    setVisiblePins((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.email || !newCustomer.phone || !newCustomer.pinCode) {
      toast.error('Please fill all fields');
      return;
    }

    // Validate PIN code (8 digits)
    if (!/^\d{8}$/.test(newCustomer.pinCode)) {
      toast.error('PIN code must be exactly 8 digits');
      return;
    }

    try {
      setIsSubmitting(true);
      const customer = await customerAPI.create(newCustomer);
      await loadData();
      setLastAddedCustomer(customer);
      setNewCustomer({ name: '', email: '', phone: '', pinCode: '' });
      setIsAddCustomerOpen(false);
      toast.success(`Customer added! Loyalty ID: ${customer.loyaltyId}`);
    } catch (error) {
      console.error('❌ Error adding customer:', error);
      toast.error(handleAPIError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      setIsSubmitting(true);
      await customerAPI.update(selectedCustomer.id, {
        name: selectedCustomer.name,
        email: selectedCustomer.email,
        phone: selectedCustomer.phone,
        points: selectedCustomer.points,
        role: selectedCustomer.role,
      });
      await loadData();
      setIsEditCustomerOpen(false);
      setSelectedCustomer(null);
      toast.success('Customer updated successfully');
    } catch (error) {
      console.error('❌ Error updating customer:', error);
      toast.error(handleAPIError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this customer? This will also delete all related purchases and coupons.'
      )
    ) {
      return;
    }

    try {
      await customerAPI.delete(id);
      await loadData();
      if (lastAddedCustomer?.id === id) {
        setLastAddedCustomer(null);
      }
      toast.success('Customer deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting customer:', error);
      toast.error(handleAPIError(error));
    }
  };

  const handleRecordPurchase = async () => {
    if (!purchaseForm.customer_id || !purchaseForm.amount || !purchaseForm.receipt_number) {
      toast.error('Please fill all fields');
      return;
    }

    const amount = parseFloat(purchaseForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid amount');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await purchaseAPI.create({
        customerId: purchaseForm.customer_id,
        amount,
        receiptNumber: purchaseForm.receipt_number,
      });

      await loadData();
      setPurchaseForm({ customer_id: '', amount: '', receipt_number: '' });
      toast.success(`Purchase recorded! ${result.purchase.pointsEarned} points added`);
    } catch (error) {
      console.error('❌ Error recording purchase:', error);
      toast.error(handleAPIError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCouponLookup = async () => {
    const code = couponSearchCode.trim();

    if (!code) {
      toast.error('Kérjük add meg a kupon kódot');
      return;
    }

    try {
      setIsLookingUp(true);
      setLookupError(null);
      const result = await couponAPI.lookup(code);

      if (result.redeemed) {
        setLookupError('Ez a kupon már be lett váltva');
        setLookupResult(null);
      } else {
        setLookupResult(result);
        setLookupError(null);
      }
    } catch (error) {
      console.error('❌ Error looking up coupon:', error);
      setLookupError('Kupon nem található');
      setLookupResult(null);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleAcceptCoupon = async () => {
    if (!lookupResult) return;

    try {
      setIsSubmitting(true);
      await couponAPI.redeem(lookupResult.code);
      toast.success('Kupon sikeresen beváltva!');

      // Clear the search
      setCouponSearchCode('');
      setLookupResult(null);
      setLookupError(null);
    } catch (error) {
      console.error('❌ Error redeeming coupon:', error);
      toast.error(handleAPIError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectCoupon = () => {
    setCouponSearchCode('');
    setLookupResult(null);
    setLookupError(null);
    toast.info('Kupon beváltás megszakítva');
  };

  const handleLogout = () => {
    clearAuth();
    authAPI.logout();
    navigate('/');
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.loyaltyId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculatePointsPreview = (amount: number, customerId: string): number => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return 0;

    const multipliers = {
      NORMAL: 1.1,
      LOYAL: 1.4,
      OWNER: 1.7,
      ADMIN: 1.0,
    };

    return Math.floor((amount / 100) * multipliers[customer.role]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <img
                src="https://mgx-backend-cdn.metadl.com/generate/images/890507/2026-01-11/182e5e45-ef20-4b26-9647-bdb4295e7326.png"
                alt="Admin"
                className="w-10 h-10 object-contain"
              />
              <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-600 hover:text-red-600">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {lastAddedCustomer && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold text-green-800">✓ Customer Successfully Added!</p>
                <div className="bg-white p-4 rounded border border-green-200">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Login Credentials:</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-gray-500">Loyalty ID:</span>
                        <p className="font-mono font-bold text-gray-900">{lastAddedCustomer.loyaltyId}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(lastAddedCustomer.loyaltyId, 'Loyalty ID')}
                      >
                        {copiedField === 'Loyalty ID' ? (
                          <CheckCheck className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-gray-500">PIN Code:</span>
                        <p className="font-mono font-bold text-gray-900">{lastAddedCustomer.pinCode}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(lastAddedCustomer.pinCode, 'PIN Code')}
                      >
                        {copiedField === 'PIN Code' ? (
                          <CheckCheck className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-3">
                    Share these credentials with <strong>{lastAddedCustomer.name}</strong> to log in.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLastAddedCustomer(null)}
                  className="text-gray-600"
                >
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Loading customers...</span>
          </div>
        ) : (
          <Tabs defaultValue="customers" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="purchases">Record Purchase</TabsTrigger>
              <TabsTrigger value="coupons">Verify Coupon</TabsTrigger>
            </TabsList>

            {/* Customers Tab */}
            <TabsContent value="customers" className="space-y-4">
              <div className="flex justify-between items-center">
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Customer
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Customer</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={newCustomer.name}
                          onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={newCustomer.email}
                          onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={newCustomer.phone}
                          onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <Label>PIN Code (8 digits)</Label>
                        <Input
                          type="tel"
                          inputMode="numeric"
                          maxLength={8}
                          placeholder="12345678"
                          value={newCustomer.pinCode}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setNewCustomer({ ...newCustomer, pinCode: value });
                          }}
                          className="font-mono"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="p-3 bg-blue-50 rounded border border-blue-200">
                        <p className="text-xs text-gray-600">
                          <AlertCircle className="w-4 h-4 inline mr-1" />A Loyalty ID will be automatically generated.
                          Customer starts with Normal role and 0 points.
                        </p>
                      </div>
                      <Button onClick={handleAddCustomer} className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          'Add Customer'
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Loyalty ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead>Visits</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCustomers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                              No customers found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredCustomers.map((customer) => (
                            <TableRow key={customer.id}>
                              <TableCell className="font-mono font-semibold">{customer.loyaltyId}</TableCell>
                              <TableCell>{customer.name}</TableCell>
                              <TableCell>{customer.email}</TableCell>
                              <TableCell>{customer.phone}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{customer.points}</Badge>
                              </TableCell>
                              <TableCell>{customer.visitCount}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={customer.role === 'OWNER' ? 'default' : 'secondary'}
                                  className={
                                    customer.role === 'LOYAL'
                                      ? 'bg-blue-100 text-blue-700'
                                      : customer.role === 'OWNER'
                                        ? 'bg-purple-600'
                                        : ''
                                  }
                                >
                                  {customer.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedCustomer(customer);
                                      setIsEditCustomerOpen(true);
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => handleDeleteCustomer(customer.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Edit Customer Dialog */}
              <Dialog open={isEditCustomerOpen} onOpenChange={setIsEditCustomerOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Customer</DialogTitle>
                  </DialogHeader>
                  {selectedCustomer && (
                    <div className="space-y-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={selectedCustomer.name}
                          onChange={(e) => setSelectedCustomer({ ...selectedCustomer, name: e.target.value })}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={selectedCustomer.email}
                          onChange={(e) => setSelectedCustomer({ ...selectedCustomer, email: e.target.value })}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={selectedCustomer.phone}
                          onChange={(e) => setSelectedCustomer({ ...selectedCustomer, phone: e.target.value })}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <Label>Points</Label>
                        <Input
                          type="number"
                          value={selectedCustomer.points}
                          onChange={(e) =>
                            setSelectedCustomer({ ...selectedCustomer, points: parseInt(e.target.value) || 0 })
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <Label>Role</Label>
                        <Select
                          value={selectedCustomer.role}
                          onValueChange={(value) =>
                            setSelectedCustomer({
                              ...selectedCustomer,
                              role: value as 'NORMAL' | 'LOYAL' | 'OWNER' | 'ADMIN',
                            })
                          }
                          disabled={isSubmitting}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NORMAL">Normal (×1.1)</SelectItem>
                            <SelectItem value="LOYAL">Loyal (×1.4)</SelectItem>
                            <SelectItem value="OWNER">Owner (×1.7)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleEditCustomer} className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Update Customer'
                        )}
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* Record Purchase Tab */}
            <TabsContent value="purchases">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Record New Purchase
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Customer</Label>
                    <Select
                      value={purchaseForm.customer_id}
                      onValueChange={(value) => setPurchaseForm({ ...purchaseForm, customer_id: value })}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name} ({customer.loyaltyId}) - {customer.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Amount (Ft)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 2500"
                      value={purchaseForm.amount}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, amount: e.target.value })}
                      disabled={isSubmitting}
                    />
                    {purchaseForm.amount && purchaseForm.customer_id && (
                      <p className="text-sm text-gray-600 mt-1">
                        Points to be earned:{' '}
                        {calculatePointsPreview(parseFloat(purchaseForm.amount), purchaseForm.customer_id)}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Receipt Number</Label>
                    <Input
                      placeholder="e.g., RCP-123"
                      value={purchaseForm.receipt_number}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, receipt_number: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <Button
                    onClick={handleRecordPurchase}
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Recording...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Record Purchase
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Verify Coupon Tab */}
            <TabsContent value="coupons">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Ticket className="w-5 h-5 mr-2" />
                    Kupon ellenőrzés
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      ℹ️ <strong>Használat:</strong> A vásárló mutatja meg a kupon kódját. Írd be a kódot az alábbi
                      mezőbe, hogy ellenőrizd és beváltsd a kupont.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="couponCode">Kupon kód</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="couponCode"
                          placeholder="pl. COUP-2024-001"
                          value={couponSearchCode}
                          onChange={(e) => setCouponSearchCode(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCouponLookup();
                            }
                          }}
                          className="font-mono text-base"
                          disabled={isLookingUp}
                        />
                        <Button
                          onClick={handleCouponLookup}
                          className="bg-blue-600 hover:bg-blue-700"
                          disabled={isLookingUp}
                        >
                          {isLookingUp ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Search className="w-4 h-4 mr-2" />
                          )}
                          Keresés
                        </Button>
                      </div>
                    </div>

                    {lookupError && (
                      <Alert className="bg-red-50 border-red-200">
                        <AlertDescription className="text-red-800">{lookupError}</AlertDescription>
                      </Alert>
                    )}

                    {lookupResult && (
                      <Card className="border-2 border-green-200 bg-green-50">
                        <CardHeader>
                          <CardTitle className="text-green-800 flex items-center justify-between">
                            <span>Kupon megtalálva!</span>
                            <Badge className="bg-green-600">Érvényes</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="bg-white p-4 rounded-lg border border-green-300 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Kupon kód:</span>
                              <span className="font-mono font-bold text-lg text-gray-900">{lookupResult.code}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Érték:</span>
                              <span className="font-bold text-lg text-green-700">
                                {lookupResult.value.toLocaleString()} Ft
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Létrehozva:</span>
                              <span className="font-medium text-gray-900">
                                {new Date(lookupResult.createdAt).toLocaleDateString('hu-HU', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <div className="pt-3 border-t border-gray-200">
                              <span className="text-sm text-gray-600 block mb-1">Tulajdonos:</span>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-bold text-gray-900">{lookupResult.customer.name}</p>
                                  <p className="text-sm text-gray-600">
                                    {lookupResult.customer.loyaltyId} • {lookupResult.customer.phone}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex space-x-3">
                            <Button
                              onClick={handleAcceptCoupon}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4 mr-2" />
                              )}
                              Elfogad és bevált
                            </Button>
                            <Button
                              onClick={handleRejectCoupon}
                              variant="outline"
                              className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                              disabled={isSubmitting}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Elutasít
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}