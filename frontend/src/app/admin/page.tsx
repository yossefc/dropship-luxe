// ============================================================================
// Admin Dashboard - Bento Grid Layout
// ============================================================================
// Luxe Minimaliste design with key business metrics and controls
// ============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/lib/hooks/use-admin-auth';

// ============================================================================
// Types
// ============================================================================

interface SystemHealth {
  database: { status: string; latencyMs?: number };
  redis: { status: string; latencyMs?: number };
  aliexpress: { status: string; lastCheck?: string };
  openai: { status: string; lastCheck?: string };
  hyp: { status: string; masof?: string };
}

interface AdminStats {
  products: { total: number; active: number; quarantined: number };
  orders: { total: number; pending: number };
  revenue: { last30Days: number };
  settings: { priceMultiplier: number };
}

interface ImportHistory {
  id: string;
  jobId: string;
  totalProcessed: number;
  importedCount: number;
  quarantinedCount: number;
  rejectedCount: number;
  errorCount: number;
  averageScore: number;
  processingTimeMs: number;
  createdAt: string;
}

interface QuarantinedProduct {
  id: string;
  aliexpressId: string;
  title: string;
  score: number;
  reason: string;
  status: string;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerEmail: string;
  total: number;
  currency: string;
  paymentStatus: string;
  orderStatus: string;
  supplierStatus: string;
  trackingNumbers: string[];
  createdAt: string;
  paidAt?: string;
}

// ============================================================================
// API Hook
// ============================================================================

function useAdminApi(): { fetchApi: <T>(endpoint: string, options?: RequestInit) => Promise<T> } {
  const { token } = useAdminAuth();

  const fetchApi = useCallback(
    async function fetchData<T>(endpoint: string, options?: RequestInit): Promise<T> {
      const response = await fetch(endpoint, {
        ...options,
        headers: {
          ...options?.headers,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      return response.json() as Promise<T>;
    },
    [token]
  );

  return { fetchApi };
}

// ============================================================================
// Dashboard Page
// ============================================================================

export default function AdminDashboard() {
  const { fetchApi } = useAdminApi();

  // State
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [imports, setImports] = useState<ImportHistory[]>([]);
  const [quarantine, setQuarantine] = useState<QuarantinedProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [priceMultiplier, setPriceMultiplier] = useState(2.5);
  const [isImporting, setIsImporting] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Fetch data
  const loadData = useCallback(async () => {
    try {
      const [healthData, statsData, importsData, quarantineData, ordersData] =
        await Promise.all([
          fetchApi<SystemHealth>('/api/admin/health'),
          fetchApi<AdminStats>('/api/admin/stats'),
          fetchApi<{ imports: ImportHistory[] }>('/api/admin/imports?limit=5'),
          fetchApi<{ products: QuarantinedProduct[] }>('/api/admin/quarantine?status=pending'),
          fetchApi<{ orders: Order[] }>('/api/admin/orders?limit=10'),
        ]);

      setHealth(healthData);
      setStats(statsData);
      setImports(importsData.imports);
      setQuarantine(quarantineData.products);
      setOrders(ordersData.orders);
      setPriceMultiplier(statsData.settings.priceMultiplier);
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    }
  }, [fetchApi]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [loadData]);

  // Actions
  const triggerImport = async () => {
    setIsImporting(true);
    try {
      await fetchApi('/api/admin/imports/run', { method: 'POST' });
      // Reload after a delay to show results
      setTimeout(loadData, 5000);
    } catch (error) {
      console.error('Import failed', error);
    }
    setIsImporting(false);
  };

  const recalculatePrices = async () => {
    setIsRecalculating(true);
    try {
      await fetchApi('/api/admin/prices/recalculate', {
        method: 'POST',
        body: JSON.stringify({ multiplier: priceMultiplier }),
      });
      loadData();
    } catch (error) {
      console.error('Price recalculation failed', error);
    }
    setIsRecalculating(false);
  };

  // Helpers
  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

  const formatDate = (dateString: string): string =>
    new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'succeeded':
      case 'delivered':
        return 'bg-emerald-100 text-emerald-700';
      case 'unhealthy':
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      case 'pending':
      case 'processing':
        return 'bg-amber-100 text-amber-700';
      case 'shipped':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="font-serif text-3xl font-light text-neutral-900">
          Tableau de bord
        </h2>
        <p className="mt-1 text-neutral-500">
          Vue d'ensemble de votre activité
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* ================================================================== */}
        {/* System Health - Spans 4 columns */}
        {/* ================================================================== */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl shadow-sm shadow-neutral-200/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-medium text-neutral-900">Santé du système</h3>
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          </div>

          <div className="space-y-4">
            {health ? (
              <>
                <HealthItem
                  label="Base de données"
                  status={health.database.status}
                  detail={health.database.latencyMs ? `${health.database.latencyMs}ms` : undefined}
                />
                <HealthItem
                  label="Redis"
                  status={health.redis.status}
                  detail={health.redis.latencyMs ? `${health.redis.latencyMs}ms` : undefined}
                />
                <HealthItem
                  label="AliExpress API"
                  status={health.aliexpress.status}
                />
                <HealthItem
                  label="OpenAI"
                  status={health.openai.status}
                />
                <HealthItem
                  label="Hyp (YaadPay)"
                  status={health.hyp.status}
                  detail={health.hyp.masof}
                />
              </>
            ) : (
              <LoadingSkeleton lines={5} />
            )}
          </div>
        </div>

        {/* ================================================================== */}
        {/* Key Metrics - Spans 8 columns */}
        {/* ================================================================== */}
        <div className="col-span-12 lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Produits actifs"
            value={stats?.products.active ?? '-'}
            icon="📦"
          />
          <MetricCard
            label="En quarantaine"
            value={stats?.products.quarantined ?? '-'}
            icon="⏸️"
            highlight={(stats?.products?.quarantined ?? 0) > 0}
          />
          <MetricCard
            label="Commandes"
            value={stats?.orders.total ?? '-'}
            icon="🛒"
          />
          <MetricCard
            label="CA (30j)"
            value={stats ? formatCurrency(stats.revenue.last30Days) : '-'}
            icon="💰"
          />
        </div>

        {/* ================================================================== */}
        {/* Import Monitoring - Spans 6 columns */}
        {/* ================================================================== */}
        <div className="col-span-12 lg:col-span-6 bg-white rounded-2xl shadow-sm shadow-neutral-200/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-medium text-neutral-900">Monitoring des imports</h3>
            <span className="text-xs text-neutral-400">Dernières synchronisations</span>
          </div>

          {imports.length > 0 ? (
            <div className="space-y-3">
              {imports.slice(0, 5).map((imp) => (
                <div
                  key={imp.id}
                  className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0"
                >
                  <div>
                    <p className="text-sm text-neutral-900">
                      {formatDate(imp.createdAt)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {imp.totalProcessed} traités • Score moy: {imp.averageScore}/100
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                      +{imp.importedCount}
                    </span>
                    {imp.quarantinedCount > 0 && (
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                        ⏸{imp.quarantinedCount}
                      </span>
                    )}
                    {imp.rejectedCount > 0 && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                        ✕{imp.rejectedCount}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-400">
              Aucun import récent
            </div>
          )}
        </div>

        {/* ================================================================== */}
        {/* Manual Import Button - Spans 6 columns */}
        {/* ================================================================== */}
        <div className="col-span-12 lg:col-span-6 bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl shadow-lg p-6 text-white">
          <h3 className="font-medium mb-2">Importation manuelle</h3>
          <p className="text-neutral-400 text-sm mb-6">
            Lancer une synchronisation des produits depuis AliExpress DS
          </p>

          <button
            onClick={triggerImport}
            disabled={isImporting}
            className="w-full py-4 px-6 bg-white text-neutral-900 rounded-xl font-semibold hover:bg-neutral-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isImporting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Import en cours...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Lancer l'importation de produits
              </>
            )}
          </button>
        </div>

        {/* ================================================================== */}
        {/* Quarantined Products - Spans 6 columns */}
        {/* ================================================================== */}
        <div className="col-span-12 lg:col-span-6 bg-white rounded-2xl shadow-sm shadow-neutral-200/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-medium text-neutral-900">Produits en quarantaine</h3>
            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
              {quarantine.length} en attente
            </span>
          </div>

          {quarantine.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {quarantine.map((product) => (
                <div
                  key={product.id}
                  className="p-3 bg-neutral-50 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-900 truncate">
                        {product.title}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        Score: <span className="font-medium text-amber-600">{product.score}/100</span>
                      </p>
                    </div>
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded ml-2 whitespace-nowrap">
                      {product.reason.split(',')[0]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-400">
              Aucun produit en quarantaine
            </div>
          )}
        </div>

        {/* ================================================================== */}
        {/* Pricing Settings - Spans 6 columns */}
        {/* ================================================================== */}
        <div className="col-span-12 lg:col-span-6 bg-white rounded-2xl shadow-sm shadow-neutral-200/50 p-6">
          <h3 className="font-medium text-neutral-900 mb-6">Réglage des marges</h3>

          <div className="space-y-6">
            <div>
              <label className="block text-sm text-neutral-600 mb-2">
                Multiplicateur de prix
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1.5"
                  max="5"
                  step="0.1"
                  value={priceMultiplier}
                  onChange={(e) => setPriceMultiplier(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900"
                />
                <span className="w-16 text-center font-semibold text-neutral-900">
                  x{priceMultiplier.toFixed(1)}
                </span>
              </div>
              <p className="mt-2 text-xs text-neutral-400">
                Prix de vente = Coût × {priceMultiplier.toFixed(1)} (marge: {((1 - 1/priceMultiplier) * 100).toFixed(0)}%)
              </p>
            </div>

            <button
              onClick={recalculatePrices}
              disabled={isRecalculating}
              className="w-full py-3 px-4 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRecalculating ? 'Mise à jour...' : 'Mettre à jour tous les prix'}
            </button>
          </div>
        </div>

        {/* ================================================================== */}
        {/* Orders Table - Full width */}
        {/* ================================================================== */}
        <div className="col-span-12 bg-white rounded-2xl shadow-sm shadow-neutral-200/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-medium text-neutral-900">Suivi des commandes</h3>
            <span className="text-xs text-neutral-400">
              {orders.length} dernières commandes
            </span>
          </div>

          {orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Commande
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Paiement Hyp
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      AliExpress
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Tracking
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-4 px-4">
                        <span className="font-mono text-sm text-neutral-900">
                          {order.orderNumber}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-neutral-600">
                          {order.customerEmail}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="font-medium text-neutral-900">
                          {formatCurrency(order.total)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.paymentStatus)}`}>
                          {order.paymentStatus === 'succeeded' ? 'Payé' : order.paymentStatus}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.supplierStatus)}`}>
                          {order.supplierStatus === 'delivered' ? 'Livré' :
                           order.supplierStatus === 'shipped' ? 'Expédié' :
                           order.supplierStatus === 'processing' ? 'En cours' :
                           order.supplierStatus === 'pending' ? 'En attente' : 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {order.trackingNumbers.length > 0 ? (
                          <span className="font-mono text-xs text-neutral-600">
                            {order.trackingNumbers[0]}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm text-neutral-500">
                          {formatDate(order.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-neutral-400">
              Aucune commande pour le moment
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

function HealthItem({
  label,
  status,
  detail,
}: {
  label: string;
  status: string;
  detail?: string;
}) {
  const getStatusIndicator = () => {
    switch (status) {
      case 'healthy':
      case 'configured':
        return 'bg-emerald-500';
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-amber-500';
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full ${getStatusIndicator()}`} />
        <span className="text-sm text-neutral-600">{label}</span>
      </div>
      {detail && (
        <span className="text-xs text-neutral-400">{detail}</span>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string | number;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm shadow-neutral-200/50 p-5 ${highlight ? 'ring-2 ring-amber-200' : ''}`}>
      <div className="flex items-start justify-between">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="mt-4 text-2xl font-light text-neutral-900">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{label}</p>
    </div>
  );
}

function LoadingSkeleton({ lines }: { lines: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="h-4 bg-neutral-200 rounded w-32 animate-pulse" />
          <div className="h-4 bg-neutral-200 rounded w-16 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
