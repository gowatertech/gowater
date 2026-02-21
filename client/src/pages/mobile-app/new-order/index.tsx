import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Plus,
  Minus,
  ShoppingCart,
  User,
  DollarSign,
  CheckCircle,
  Package,
  MapPin,
  Phone,
  CreditCard,
  Banknote,
  Heart,
  Check,
  Loader2,
  Droplets
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getTodayStringRD } from "@/lib/date-utils";

interface Customer {
  id: number;
  businessname: string;
  managername: string;
  phone: string;
  street: string;
  streetnumber: string;
  sector: string;
  city: string;
  isCharity?: boolean;
}

interface Product {
  id: number;
  name: string;
  price: string;
  stock: number;
  icon: string;
  isReturnable: boolean;
  depositAmount: string;
  hasCommission: boolean;
  companyId: number;
}

interface OrderItem {
  productId: number;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

const STEPS = [
  { id: 1, label: "Cliente", icon: User },
  { id: 2, label: "Productos", icon: ShoppingCart },
  { id: 3, label: "Confirmar", icon: CheckCircle },
];

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

export default function NewOrder() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit" | "donation">("cash");

  const { data: customers = [], isLoading: loadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/mobile/customers"],
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/mobile/products"],
  });

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const term = customerSearch.toLowerCase().trim();
    const termDigits = term.replace(/\D/g, "");
    return customers.filter((c) => {
      if ((c.businessname || "").toLowerCase().includes(term)) return true;
      if ((c.managername || "").toLowerCase().includes(term)) return true;
      const phone = c.phone || "";
      if (phone.includes(term)) return true;
      if (termDigits && phone.replace(/\D/g, "").includes(termDigits)) return true;
      return false;
    });
  }, [customers, customerSearch]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  useEffect(() => {
    if (selectedCustomer?.isCharity) {
      setPaymentMethod("donation");
    } else if (paymentMethod === "donation") {
      setPaymentMethod("cash");
    }
  }, [selectedCustomer]);

  const subtotal = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.total, 0);
  }, [orderItems]);

  const itbis = subtotal * 0.18;
  const total = subtotal + itbis;

  const totalItems = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [orderItems]);

  const updateQuantity = (productId: number, delta: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const productPrice = parseFloat(product.price);

    setOrderItems((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        const newQuantity = Math.max(0, existing.quantity + delta);
        if (newQuantity === 0) {
          return prev.filter((item) => item.productId !== productId);
        }
        return prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
            : item
        );
      } else if (delta > 0) {
        return [
          ...prev,
          { productId: product.id, name: product.name, quantity: 1, price: productPrice, total: productPrice },
        ];
      }
      return prev;
    });
  };

  const getQuantity = (productId: number) => {
    return orderItems.find((item) => item.productId === productId)?.quantity || 0;
  };

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const orderData = {
        customerId: selectedCustomerId,
        total,
        paymentMethod: paymentMethod,
        orderDate: getTodayStringRD(),
        notes: "",
        items: orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        })),
      };
      return apiRequest({ method: "POST", url: "/api/orders", data: orderData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mobile/orders"] });
      toast({ title: "Pedido creado", description: "El pedido se ha registrado exitosamente" });
      setLocation("/mobile-app");
    },
    onError: (error: any) => {
      toast({ title: "Error al crear pedido", description: error.message || "No se pudo crear el pedido", variant: "destructive" });
      setIsSubmitting(false);
    },
  });

  const handleCreateOrder = () => {
    if (!selectedCustomerId || orderItems.length === 0) return;
    setIsSubmitting(true);
    createOrderMutation.mutate();
  };

  const canGoNext = () => {
    if (currentStep === 1) return !!selectedCustomerId;
    if (currentStep === 2) return orderItems.length > 0;
    return true;
  };

  const handleNext = () => {
    if (currentStep < 3 && canGoNext()) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
    else setLocation("/mobile-app");
  };

  const handleSelectCustomer = (id: number) => {
    setSelectedCustomerId(id);
    setTimeout(() => setCurrentStep(2), 300);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-20 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-700 text-white shadow-lg">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="font-bold text-base">Nuevo Pedido</h1>
                <p className="text-blue-200 text-xs">Paso {currentStep} de 3</p>
              </div>
            </div>
            {totalItems > 0 && (
              <div className="flex items-center gap-2 bg-white/20 rounded-xl px-3 py-1.5">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-sm font-bold">{totalItems}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="flex items-center gap-1">
            {STEPS.map((step, idx) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex items-center gap-1.5 flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      currentStep > step.id
                        ? "bg-white text-blue-600"
                        : currentStep === step.id
                        ? "bg-white/30 text-white ring-2 ring-white"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
                  </div>
                  <span
                    className={`text-[11px] font-medium hidden min-[380px]:block ${
                      currentStep >= step.id ? "text-white" : "text-white/40"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-1 rounded transition-all duration-300 ${
                      currentStep > step.id ? "bg-white" : "bg-white/20"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-28">
        {currentStep === 1 && (
          <div className="px-4 py-4">
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, teléfono..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-12 h-12 text-base rounded-2xl border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
                data-testid="input-search-customer"
              />
            </div>

            {selectedCustomer && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-4" data-testid="customer-info">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                    {getInitials(selectedCustomer.businessname)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{selectedCustomer.businessname}</p>
                    <p className="text-xs text-gray-500 truncate">{selectedCustomer.managername}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-blue-600 text-white rounded-full px-2 py-1">
                    <Check className="h-3 w-3" />
                    <span className="text-[10px] font-bold">Seleccionado</span>
                  </div>
                </div>
                <button
                  className="mt-3 text-xs text-blue-600 font-medium"
                  onClick={() => { setSelectedCustomerId(null); setCustomerSearch(""); }}
                  data-testid="button-change-customer"
                >
                  Cambiar cliente
                </button>
              </div>
            )}

            {selectedCustomer?.isCharity && paymentMethod === "donation" && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-4" data-testid="donation-indicator">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Heart className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-800 text-sm">Pedido de Donación</p>
                    <p className="text-xs text-amber-600">No se generará factura</p>
                  </div>
                </div>
              </div>
            )}

            {loadingCustomers ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
                <p className="text-sm text-gray-500">Cargando clientes...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                  <User className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-sm text-gray-500">No se encontraron clientes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCustomers.map((customer) => {
                  const isSelected = customer.id === selectedCustomerId;
                  return (
                    <button
                      key={customer.id}
                      className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 active:scale-[0.98] text-left ${
                        isSelected
                          ? "bg-blue-50 border-blue-300 shadow-sm"
                          : "bg-white border-gray-100 hover:border-gray-200 shadow-sm"
                      }`}
                      onClick={() => handleSelectCustomer(customer.id)}
                      data-testid={`option-customer-${customer.id}`}
                    >
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          isSelected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {getInitials(customer.businessname)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{customer.businessname}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {customer.managername && (
                            <span className="text-xs text-gray-500 truncate">{customer.managername}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {customer.phone && (
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </span>
                          )}
                          {customer.sector && (
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {customer.sector}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div className="px-4 py-4">
            {selectedCustomer && (
              <div className="flex items-center gap-3 bg-white rounded-2xl p-3 mb-4 border border-gray-100 shadow-sm">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xs">
                  {getInitials(selectedCustomer.businessname)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{selectedCustomer.businessname}</p>
                  <p className="text-xs text-gray-500">{selectedCustomer.sector || selectedCustomer.city}</p>
                </div>
                {totalItems > 0 && (
                  <Badge className="bg-blue-100 text-blue-700 border-0 font-bold">
                    {totalItems} items
                  </Badge>
                )}
              </div>
            )}

            {loadingProducts ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
                <p className="text-sm text-gray-500">Cargando productos...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {products.map((product) => {
                  const quantity = getQuantity(product.id);
                  const productPrice = parseFloat(product.price);
                  const hasItems = quantity > 0;

                  return (
                    <div
                      key={product.id}
                      className={`relative bg-white rounded-2xl border-2 overflow-hidden transition-all duration-200 shadow-sm ${
                        hasItems ? "border-blue-300 shadow-blue-100" : "border-gray-100"
                      }`}
                    >
                      {hasItems && (
                        <div className="absolute top-2 right-2 z-10">
                          <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                            {quantity}
                          </div>
                        </div>
                      )}

                      <div className="p-3 pb-2 text-center">
                        <div
                          className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-2 ${
                            hasItems ? "bg-blue-100" : "bg-gray-50"
                          }`}
                        >
                          {product.isReturnable ? (
                            <Droplets className={`h-7 w-7 ${hasItems ? "text-blue-600" : "text-gray-400"}`} />
                          ) : (
                            <Package className={`h-7 w-7 ${hasItems ? "text-blue-600" : "text-gray-400"}`} />
                          )}
                        </div>
                        <p className="font-semibold text-xs text-gray-900 leading-tight line-clamp-2 min-h-[2rem]">
                          {product.name}
                        </p>
                        <p className={`text-sm font-bold mt-1 ${hasItems ? "text-blue-600" : "text-gray-700"}`}>
                          RD$ {productPrice.toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center justify-center gap-1 px-2 pb-3">
                        <button
                          className="h-11 w-11 rounded-xl bg-gray-100 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30"
                          onClick={() => updateQuantity(product.id, -1)}
                          disabled={quantity === 0}
                          data-testid={`button-decrease-${product.id}`}
                        >
                          <Minus className="h-5 w-5 text-gray-700" />
                        </button>

                        <div
                          className="w-10 text-center font-bold text-lg text-gray-900"
                          data-testid={`text-quantity-${product.id}`}
                        >
                          {quantity}
                        </div>

                        <button
                          className="h-11 w-11 rounded-xl bg-blue-600 flex items-center justify-center active:scale-95 transition-transform shadow-md shadow-blue-200"
                          onClick={() => updateQuantity(product.id, 1)}
                          data-testid={`button-increase-${product.id}`}
                        >
                          <Plus className="h-5 w-5 text-white" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div className="px-4 py-4 space-y-4">
            {selectedCustomer && (
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Cliente</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                    {getInitials(selectedCustomer.businessname)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{selectedCustomer.businessname}</p>
                    <p className="text-xs text-gray-500">{selectedCustomer.managername}</p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedCustomer.street} #{selectedCustomer.streetnumber}
                      {selectedCustomer.sector && `, ${selectedCustomer.sector}`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Productos ({totalItems})
              </p>
              <div className="space-y-3">
                {orderItems.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Package className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {item.quantity} × RD$ {item.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-gray-900">RD$ {item.total.toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-700" data-testid="text-subtotal">RD$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">ITBIS (18%)</span>
                  <span className="text-gray-700" data-testid="text-itbis">RD$ {itbis.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-dashed border-gray-200">
                  <span className="text-gray-900">Total</span>
                  <span className="text-blue-600" data-testid="text-total">RD$ {total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {!selectedCustomer?.isCharity && (
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Método de Pago
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "cash" as const, label: "Efectivo", icon: Banknote, color: "emerald" },
                    { value: "credit" as const, label: "Crédito", icon: CreditCard, color: "blue" },
                  ].map((method) => (
                    <button
                      key={method.value}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all active:scale-[0.97] ${
                        paymentMethod === method.value
                          ? method.color === "emerald"
                            ? "border-emerald-300 bg-emerald-50"
                            : "border-blue-300 bg-blue-50"
                          : "border-gray-100 bg-white"
                      }`}
                      onClick={() => setPaymentMethod(method.value)}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          paymentMethod === method.value
                            ? method.color === "emerald"
                              ? "bg-emerald-200"
                              : "bg-blue-200"
                            : "bg-gray-100"
                        }`}
                      >
                        <method.icon
                          className={`h-5 w-5 ${
                            paymentMethod === method.value
                              ? method.color === "emerald"
                                ? "text-emerald-700"
                                : "text-blue-700"
                              : "text-gray-400"
                          }`}
                        />
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          paymentMethod === method.value ? "text-gray-900" : "text-gray-500"
                        }`}
                      >
                        {method.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedCustomer?.isCharity && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4" data-testid="donation-indicator">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Heart className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-800 text-sm">Donación</p>
                    <p className="text-xs text-amber-600">No se generará factura</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-20">
        <div className="px-4 py-3 max-w-2xl mx-auto">
          {currentStep < 3 ? (
            <div className="flex gap-3">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 rounded-xl px-5 border-2"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <Button
                size="lg"
                className="flex-1 h-14 rounded-xl font-semibold text-base bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform"
                onClick={handleNext}
                disabled={!canGoNext()}
                data-testid="button-next-step"
              >
                {currentStep === 1 && !selectedCustomerId ? (
                  "Selecciona un cliente"
                ) : currentStep === 2 && orderItems.length === 0 ? (
                  "Agrega productos"
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button
              size="lg"
              className="w-full h-14 rounded-xl font-semibold text-base bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform"
              onClick={handleCreateOrder}
              disabled={isSubmitting}
              data-testid="button-create-order"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Creando pedido...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Confirmar Pedido • RD$ {total.toFixed(2)}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
