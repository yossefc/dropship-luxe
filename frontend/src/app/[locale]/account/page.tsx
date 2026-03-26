'use client';

// ============================================================================
// ACCOUNT DASHBOARD - Espace Client Hayoss
// ============================================================================

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Package,
  Truck,
  MapPin,
  User,
  LogOut,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShoppingBag,
  Settings,
  Heart,
  Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'succeeded' | 'failed';
  total: number;
  currency: string;
  createdAt: string;
  items: OrderItem[];
  trackingNumbers: string[];
  shippedAt?: string;
  deliveredAt?: string;
}

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  variantName?: string;
}

interface TrackingInfo {
  trackingNumber: string;
  carrier: string;
  status: string;
  statusDescription: string;
  lastUpdate: string;
  estimatedDelivery?: string;
  events: TrackingEvent[];
}

interface TrackingEvent {
  date: string;
  status: string;
  location?: string;
  description: string;
}

// ============================================================================
// MOCK DATA (Replace with actual API calls)
// ============================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// ============================================================================
// STATUS CONFIGURATIONS
// ============================================================================

const orderStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  paid: { label: 'Payée', color: 'bg-blue-100 text-blue-800', icon: CheckCircle2 },
  processing: { label: 'En préparation', color: 'bg-purple-100 text-purple-800', icon: Package },
  shipped: { label: 'Expédiée', color: 'bg-indigo-100 text-indigo-800', icon: Truck },
  delivered: { label: 'Livrée', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800', icon: AlertCircle },
};

// ============================================================================
// ACCOUNT DASHBOARD COMPONENT
// ============================================================================

export default function AccountDashboard() {
  const { data: session, status } = useSession();
  const locale = useLocale();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'addresses' | 'settings'>('overview');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [loadingTracking, setLoadingTracking] = useState(false);

  // Fetch orders
  useEffect(() => {
    async function fetchOrders() {
      if (!session?.user?.email) return;

      try {
        const res = await fetch(`${API_URL}/orders/customer?email=${session.user.email}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setOrders(data.data);
          }
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    }

    if (status === 'authenticated') {
      fetchOrders();
    } else if (status !== 'loading') {
      setLoading(false);
    }
  }, [session, status]);

  // Fetch tracking info for an order
  const fetchTrackingInfo = async (trackingNumber: string) => {
    setLoadingTracking(true);
    try {
      const res = await fetch(`${API_URL}/tracking/${trackingNumber}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTrackingInfo(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching tracking:', error);
    } finally {
      setLoadingTracking(false);
    }
  };

  const formatPrice = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Loading state
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#F8F7F5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#B76E79] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-500">Chargement...</p>
        </div>
      </div>
    );
  }

  const recentOrders = orders.slice(0, 3);
  const pendingOrders = orders.filter(o => ['pending', 'paid', 'processing', 'shipped'].includes(o.status));

  return (
    <div className="min-h-screen bg-[#F8F7F5]">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="font-serif text-2xl text-[#1A1A1A]">
              Hayoss
            </Link>

            <div className="flex items-center gap-4">
              <span className="text-sm text-neutral-600">
                {session?.user?.name || session?.user?.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-2 text-sm text-neutral-500 hover:text-[#B76E79] transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:w-64 flex-shrink-0">
            <nav className="bg-white rounded-2xl shadow-sm p-4 sticky top-24">
              <div className="mb-6 p-4 bg-[#F8F7F5] rounded-xl">
                <div className="w-12 h-12 bg-[#B76E79]/10 rounded-full flex items-center justify-center mb-3">
                  <User className="w-6 h-6 text-[#B76E79]" />
                </div>
                <p className="font-semibold text-[#1A1A1A]">
                  {session?.user?.name || 'Client'}
                </p>
                <p className="text-sm text-neutral-500 truncate">
                  {session?.user?.email}
                </p>
              </div>

              <ul className="space-y-1">
                {[
                  { id: 'overview', label: 'Tableau de bord', icon: ShoppingBag },
                  { id: 'orders', label: 'Mes commandes', icon: Package },
                  { id: 'addresses', label: 'Mes adresses', icon: MapPin },
                  { id: 'settings', label: 'Paramètres', icon: Settings },
                ].map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveTab(item.id as any)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                        activeTab === item.id
                          ? 'bg-[#B76E79]/10 text-[#B76E79]'
                          : 'text-neutral-600 hover:bg-neutral-100'
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Welcome Section */}
                  <div className="bg-gradient-to-r from-[#1A1A1A] to-[#2D2D2D] rounded-2xl p-8 mb-8 text-white">
                    <h1 className="font-serif text-3xl mb-2">
                      Bonjour, {session?.user?.name?.split(' ')[0] || 'Client'} !
                    </h1>
                    <p className="text-neutral-300">
                      Bienvenue dans votre espace personnel Hayoss.
                    </p>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <Package className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-semibold text-[#1A1A1A]">{orders.length}</p>
                          <p className="text-sm text-neutral-500">Commandes totales</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                          <Truck className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-semibold text-[#1A1A1A]">{pendingOrders.length}</p>
                          <p className="text-sm text-neutral-500">En cours</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-semibold text-[#1A1A1A]">
                            {orders.filter(o => o.status === 'delivered').length}
                          </p>
                          <p className="text-sm text-neutral-500">Livrées</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Orders */}
                  <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="font-serif text-xl text-[#1A1A1A]">Commandes récentes</h2>
                      <button
                        onClick={() => setActiveTab('orders')}
                        className="text-sm text-[#B76E79] hover:underline flex items-center gap-1"
                      >
                        Voir tout
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {recentOrders.length === 0 ? (
                      <div className="text-center py-12">
                        <ShoppingBag className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                        <p className="text-neutral-500 mb-4">Aucune commande pour le moment</p>
                        <Button asChild variant="primary">
                          <Link href={`/${locale}/collections`}>
                            Découvrir nos produits
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {recentOrders.map((order) => {
                          const statusInfo = orderStatusConfig[order.status];
                          const StatusIcon = statusInfo.icon;

                          return (
                            <div
                              key={order.id}
                              className="border border-neutral-200 rounded-xl p-4 hover:border-[#B76E79]/30 transition-colors cursor-pointer"
                              onClick={() => {
                                setSelectedOrder(order);
                                setActiveTab('orders');
                              }}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-sm font-medium text-[#1A1A1A]">
                                    {order.orderNumber}
                                  </span>
                                  <span className={cn(
                                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                                    statusInfo.color
                                  )}>
                                    <StatusIcon className="w-3 h-3" />
                                    {statusInfo.label}
                                  </span>
                                </div>
                                <span className="text-sm text-neutral-500">
                                  {formatDate(order.createdAt)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <p className="text-sm text-neutral-600">
                                  {order.items.length} article{order.items.length > 1 ? 's' : ''}
                                </p>
                                <p className="font-semibold text-[#1A1A1A]">
                                  {formatPrice(order.total, order.currency)}
                                </p>
                              </div>

                              {order.trackingNumbers.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-neutral-100">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      fetchTrackingInfo(order.trackingNumbers[0]);
                                    }}
                                    className="flex items-center gap-2 text-sm text-[#B76E79] hover:underline"
                                  >
                                    <Truck className="w-4 h-4" />
                                    Suivre ma commande
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'orders' && (
                <motion.div
                  key="orders"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1 className="font-serif text-3xl text-[#1A1A1A] mb-8">Mes commandes</h1>

                  {orders.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                      <Package className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                      <h2 className="font-serif text-2xl text-[#1A1A1A] mb-2">Aucune commande</h2>
                      <p className="text-neutral-500 mb-6">
                        Vous n'avez pas encore passé de commande.
                      </p>
                      <Button asChild variant="primary" size="lg">
                        <Link href={`/${locale}/collections`}>
                          Commencer mes achats
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {orders.map((order) => {
                        const statusInfo = orderStatusConfig[order.status];
                        const StatusIcon = statusInfo.icon;

                        return (
                          <div
                            key={order.id}
                            className="bg-white rounded-2xl shadow-sm overflow-hidden"
                          >
                            {/* Order Header */}
                            <div className="p-6 border-b border-neutral-100">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-mono text-lg font-semibold text-[#1A1A1A]">
                                      {order.orderNumber}
                                    </h3>
                                    <span className={cn(
                                      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium',
                                      statusInfo.color
                                    )}>
                                      <StatusIcon className="w-4 h-4" />
                                      {statusInfo.label}
                                    </span>
                                  </div>
                                  <p className="text-sm text-neutral-500">
                                    Commandé le {formatDate(order.createdAt)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-serif text-2xl text-[#1A1A1A]">
                                    {formatPrice(order.total, order.currency)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Order Items */}
                            <div className="p-6">
                              <div className="space-y-4">
                                {order.items.map((item) => (
                                  <div key={item.id} className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-neutral-100 rounded-lg flex items-center justify-center">
                                      <Package className="w-6 h-6 text-neutral-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-[#1A1A1A] truncate">
                                        {item.productName}
                                      </p>
                                      {item.variantName && (
                                        <p className="text-sm text-neutral-500">{item.variantName}</p>
                                      )}
                                      <p className="text-sm text-neutral-500">Qté: {item.quantity}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-medium text-[#1A1A1A]">
                                        {formatPrice(item.unitPrice * item.quantity)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Tracking Section */}
                              {order.trackingNumbers.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-neutral-100">
                                  <h4 className="font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-[#B76E79]" />
                                    Suivi de livraison
                                  </h4>
                                  <div className="space-y-3">
                                    {order.trackingNumbers.map((tracking, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between p-4 bg-[#F8F7F5] rounded-lg"
                                      >
                                        <div>
                                          <p className="font-mono text-sm font-medium text-[#1A1A1A]">
                                            {tracking}
                                          </p>
                                          <p className="text-sm text-neutral-500">
                                            Colis {idx + 1}
                                          </p>
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => fetchTrackingInfo(tracking)}
                                        >
                                          {loadingTracking ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                          ) : (
                                            'Suivre'
                                          )}
                                        </Button>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Tracking Info Display */}
                                  {trackingInfo && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      className="mt-4 p-4 bg-blue-50 rounded-lg"
                                    >
                                      <div className="flex items-center justify-between mb-4">
                                        <div>
                                          <p className="font-medium text-blue-900">
                                            {trackingInfo.status}
                                          </p>
                                          <p className="text-sm text-blue-700">
                                            {trackingInfo.statusDescription}
                                          </p>
                                        </div>
                                        {trackingInfo.estimatedDelivery && (
                                          <div className="text-right">
                                            <p className="text-sm text-blue-700">Livraison estimée</p>
                                            <p className="font-medium text-blue-900">
                                              {formatDate(trackingInfo.estimatedDelivery)}
                                            </p>
                                          </div>
                                        )}
                                      </div>

                                      {/* Tracking Timeline */}
                                      {trackingInfo.events.length > 0 && (
                                        <div className="space-y-3">
                                          {trackingInfo.events.slice(0, 5).map((event, idx) => (
                                            <div key={idx} className="flex gap-3">
                                              <div className="relative">
                                                <div className={cn(
                                                  'w-3 h-3 rounded-full mt-1',
                                                  idx === 0 ? 'bg-blue-600' : 'bg-blue-300'
                                                )} />
                                                {idx < trackingInfo.events.length - 1 && (
                                                  <div className="absolute top-4 left-1.5 w-px h-full bg-blue-200 -translate-x-1/2" />
                                                )}
                                              </div>
                                              <div className="flex-1 pb-4">
                                                <p className="text-sm font-medium text-blue-900">
                                                  {event.description}
                                                </p>
                                                <p className="text-xs text-blue-700">
                                                  {formatDate(event.date)}
                                                  {event.location && ` - ${event.location}`}
                                                </p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </motion.div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'addresses' && (
                <motion.div
                  key="addresses"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center justify-between mb-8">
                    <h1 className="font-serif text-3xl text-[#1A1A1A]">Mes adresses</h1>
                    <Button variant="primary">
                      Ajouter une adresse
                    </Button>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                    <MapPin className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                    <h2 className="font-serif text-2xl text-[#1A1A1A] mb-2">Aucune adresse</h2>
                    <p className="text-neutral-500">
                      Ajoutez une adresse pour accélérer vos prochaines commandes.
                    </p>
                  </div>
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1 className="font-serif text-3xl text-[#1A1A1A] mb-8">Paramètres</h1>

                  <div className="space-y-6">
                    {/* Profile Section */}
                    <div className="bg-white rounded-2xl shadow-sm p-6">
                      <h2 className="font-semibold text-lg text-[#1A1A1A] mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-[#B76E79]" />
                        Informations personnelles
                      </h2>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-600 mb-1">
                            Nom complet
                          </label>
                          <input
                            type="text"
                            defaultValue={session?.user?.name || ''}
                            className="w-full px-4 py-3 bg-[#F8F7F5] border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B76E79]/30 focus:border-[#B76E79]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-600 mb-1">
                            Adresse email
                          </label>
                          <input
                            type="email"
                            defaultValue={session?.user?.email || ''}
                            disabled
                            className="w-full px-4 py-3 bg-neutral-100 border border-neutral-200 rounded-lg text-neutral-500"
                          />
                        </div>
                      </div>

                      <Button variant="primary" className="mt-6">
                        Sauvegarder
                      </Button>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-red-200">
                      <h2 className="font-semibold text-lg text-red-600 mb-4">
                        Zone de danger
                      </h2>
                      <p className="text-sm text-neutral-600 mb-4">
                        Une fois votre compte supprimé, toutes vos données seront définitivement effacées.
                      </p>
                      <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                        Supprimer mon compte
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
