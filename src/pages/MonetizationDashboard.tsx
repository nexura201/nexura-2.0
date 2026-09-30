import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MonetizationService } from '../services/monetization.service';
import { formatCurrency } from '../services/payment.provider';
import * as db from '../services/database';
import type { MonetizationDashboardStats, MonetizationSettings } from '../types';
import {
  DollarSign, Users, TrendingUp, CreditCard, Settings,
  AlertCircle, CheckCircle, ArrowRight, Plus
} from 'lucide-react';

export function MonetizationDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<MonetizationDashboardStats | null>(null);
  const [monetizationSettings, setMonetizationSettings] = useState<MonetizationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = () => {
    if (!user) return;

    const channel = db.getChannelByUserId(user.id);
    if (!channel) {
      setLoading(false);
      return;
    }

    // Cargar estadísticas (sin datos ficticios)
    const dashboardStats = MonetizationService.getDashboardStats(channel.id);
    setStats(dashboardStats);

    // Cargar configuración de monetización
    const settings = MonetizationService.getChannelMonetizationSettings(channel.id);
    setMonetizationSettings(settings);

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-bg-elevated rounded w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-bg-elevated rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats || !monetizationSettings) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">No tienes un canal</h1>
        <p className="text-text-secondary">Crea un canal para comenzar a monetizar.</p>
      </div>
    );
  }

  const isSetupComplete = 
    monetizationSettings.acceptSubscriptions || 
    monetizationSettings.acceptDonations;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Monetización</h1>
          <p className="text-text-secondary mt-1">Gestiona tus ingresos y suscripciones</p>
        </div>
        <Link
          to="/dashboard/monetization/settings"
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
          Configurar
        </Link>
      </div>

      {/* Estado de configuración */}
      {!isSetupComplete && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-warning flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">
                Configura tu monetización
              </h3>
              <p className="text-text-secondary mb-4">
                Para comenzar a recibir pagos, necesitas configurar al menos una opción de monetización.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {monetizationSettings.acceptSubscriptions ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-text-muted" />
                  )}
                  <span className="text-text-secondary">Suscripciones</span>
                </div>
                <div className="flex items-center gap-2">
                  {monetizationSettings.acceptDonations ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-text-muted" />
                  )}
                  <span className="text-text-secondary">Donaciones</span>
                </div>
              </div>
              <Link
                to="/dashboard/monetization/settings"
                className="inline-flex items-center gap-2 mt-4 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors"
              >
                Comenzar configuración
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={DollarSign}
          label="Ingresos totales"
          value={formatCurrency(stats.totalRevenue, 'USD')}
          color="text-success"
          bgColor="bg-success/10"
        />
        <StatCard
          icon={Users}
          label="Suscriptores activos"
          value={stats.activeSubscribers}
          color="text-primary-light"
          bgColor="bg-primary/10"
        />
        <StatCard
          icon={CreditCard}
          label="Donaciones"
          value={stats.totalDonations}
          color="text-warning"
          bgColor="bg-warning/10"
        />
        <StatCard
          icon={TrendingUp}
          label="Balance disponible"
          value={formatCurrency(stats.availableBalance, 'USD')}
          color="text-success"
          bgColor="bg-success/10"
        />
      </div>

      {/* Revenue by Period */}
      <div className="bg-bg-card border border-border rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-white mb-6">Ingresos por período</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div>
            <p className="text-text-muted text-sm mb-2">Hoy</p>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(stats.revenueByPeriod.today, 'USD')}
            </p>
          </div>
          <div>
            <p className="text-text-muted text-sm mb-2">Últimos 7 días</p>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(stats.revenueByPeriod.last7Days, 'USD')}
            </p>
          </div>
          <div>
            <p className="text-text-muted text-sm mb-2">Últimos 30 días</p>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(stats.revenueByPeriod.last30Days, 'USD')}
            </p>
          </div>
          <div>
            <p className="text-text-muted text-sm mb-2">Últimos 90 días</p>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(stats.revenueByPeriod.last90Days, 'USD')}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Link
          to="/dashboard/monetization/subscriptions"
          className="bg-bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-all group"
        >
          <Users className="w-8 h-8 text-primary-light mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-semibold text-white mb-1">Suscripciones</h3>
          <p className="text-sm text-text-muted">Gestiona planes y suscriptores</p>
        </Link>

        <Link
          to="/dashboard/monetization/transactions"
          className="bg-bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-all group"
        >
          <CreditCard className="w-8 h-8 text-success mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-semibold text-white mb-1">Transacciones</h3>
          <p className="text-sm text-text-muted">Historial de pagos</p>
        </Link>

        <Link
          to="/dashboard/monetization/payouts"
          className="bg-bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-all group"
        >
          <DollarSign className="w-8 h-8 text-warning mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-semibold text-white mb-1">Retiros</h3>
          <p className="text-sm text-text-muted">Solicita tus pagos</p>
        </Link>
      </div>

      {/* Empty State */}
      {stats.totalRevenue === 0 && (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
          <DollarSign className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            No hay ingresos todavía
          </h2>
          <p className="text-text-secondary mb-6">
            Configura tus planes de suscripción o habilita las donaciones para comenzar a recibir pagos.
          </p>
          <Link
            to="/dashboard/monetization/subscriptions"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Crear primer plan
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bgColor }: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-6">
      <div className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center mb-4`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-text-muted mt-1">{label}</p>
    </div>
  );
}
