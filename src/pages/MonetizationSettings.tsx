import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MonetizationService } from '../services/monetization.service';
import * as db from '../services/database';
import type { MonetizationSettings } from '../types';
import {
  ArrowLeft, Save, AlertCircle, CheckCircle, DollarSign,
  CreditCard, Settings
} from 'lucide-react';

export function MonetizationSettingsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<MonetizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = () => {
    if (!user) return;

    const channel = db.getChannelByUserId(user.id);
    if (!channel) {
      setLoading(false);
      return;
    }

    const currentSettings = MonetizationService.getChannelMonetizationSettings(channel.id);
    setSettings(currentSettings);
    setLoading(false);
  };

  const handleSave = () => {
    if (!user || !settings) return;

    setSaving(true);

    try {
      const channel = db.getChannelByUserId(user.id);
      if (!channel) throw new Error('Canal no encontrado');

      // Actualizar configuración
      MonetizationService.updateChannelMonetizationSettings(
        channel.id,
        settings,
        user.id
      );

      addToast('success', 'Configuración guardada correctamente');
      navigate('/dashboard/monetization');
    } catch (error) {
      addToast('error', 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-bg-elevated rounded w-64" />
          <div className="h-96 bg-bg-elevated rounded-xl" />
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">No tienes un canal</h1>
        <p className="text-text-secondary">Crea un canal para configurar la monetización.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/dashboard/monetization')}
          className="p-2 hover:bg-bg-elevated rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">Configuración de monetización</h1>
          <p className="text-text-secondary mt-1">
            Configura cómo quieres recibir pagos
          </p>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-primary-light flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Configuración de pagos
            </h3>
            <p className="text-text-secondary">
              Para procesar pagos reales, necesitas conectar un proveedor de pagos (Stripe, PayPal, etc.) 
              en el backend de NEXURA. Esta configuración prepara tu canal para recibir pagos una vez 
              que el backend esté configurado.
            </p>
          </div>
        </div>
      </div>

      {/* Subscriptions */}
      <div className="bg-bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-primary-light" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white mb-2">Suscripciones</h2>
            <p className="text-text-secondary">
              Permite que los usuarios se suscriban a tu canal con planes mensuales o anuales.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-bg-elevated rounded-lg cursor-pointer">
            <div>
              <p className="text-white font-medium">Aceptar suscripciones</p>
              <p className="text-sm text-text-muted mt-1">
                Los usuarios podrán suscribirse a tu canal
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.acceptSubscriptions}
              onChange={e => setSettings({ ...settings, acceptSubscriptions: e.target.checked })}
              className="w-5 h-5 rounded border-border bg-bg-input text-primary focus:ring-primary"
            />
          </label>
        </div>
      </div>

      {/* Donations */}
      <div className="bg-bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-success" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white mb-2">Donaciones</h2>
            <p className="text-text-secondary">
              Permite que los usuarios te hagan donaciones únicas.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-bg-elevated rounded-lg cursor-pointer">
            <div>
              <p className="text-white font-medium">Aceptar donaciones</p>
              <p className="text-sm text-text-muted mt-1">
                Los usuarios podrán donar a tu canal
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.acceptDonations}
              onChange={e => setSettings({ ...settings, acceptDonations: e.target.checked })}
              className="w-5 h-5 rounded border-border bg-bg-input text-primary focus:ring-primary"
            />
          </label>

          {settings.acceptDonations && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Moneda
                </label>
                <select
                  value={settings.currency}
                  onChange={e => setSettings({ ...settings, currency: e.target.value })}
                  className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
                >
                  <option value="USD">USD - Dólar estadounidense</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="UYU">UYU - Peso uruguayo</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="bg-bg-card border border-border rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Estado</h2>
        <div className="flex items-center gap-3">
          {settings.status === 'ACTIVE' ? (
            <>
              <CheckCircle className="w-6 h-6 text-success" />
              <div>
                <p className="text-white font-medium">Monetización activa</p>
                <p className="text-sm text-text-muted">
                  Tu canal está listo para recibir pagos
                </p>
              </div>
            </>
          ) : settings.status === 'SETUP_REQUIRED' ? (
            <>
              <AlertCircle className="w-6 h-6 text-warning" />
              <div>
                <p className="text-white font-medium">Configuración requerida</p>
                <p className="text-sm text-text-muted">
                  Habilita al menos una opción de monetización
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-6 h-6 text-danger" />
              <div>
                <p className="text-white font-medium">Monetización deshabilitada</p>
                <p className="text-sm text-text-muted">
                  {settings.status === 'SUSPENDED' 
                    ? 'La monetización ha sido suspendida'
                    : 'La monetización está deshabilitada'}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <button
          onClick={() => navigate('/dashboard/monetization')}
          className="px-6 py-2.5 bg-bg-elevated hover:bg-bg-input border border-border text-text-secondary hover:text-white rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar configuración
            </>
          )}
        </button>
      </div>
    </div>
  );
}
