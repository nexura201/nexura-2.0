import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Mail, Book, HelpCircle, AlertTriangle, CheckCircle } from 'lucide-react';

export function SupportPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    {
      id: 'account',
      title: 'Cuenta y Perfil',
      icon: '👤',
      description: 'Problemas con tu cuenta, inicio de sesión, perfil',
      faqs: [
        { q: '¿Cómo cambio mi contraseña?', a: 'Ve a Configuración → Seguridad → Cambiar contraseña' },
        { q: '¿Cómo verifico mi email?', a: 'Revisá tu email y hacé clic en el enlace de verificación' },
        { q: '¿Cómo cambio mi nombre de usuario?', a: 'Ve a Configuración → Cuenta → Nombre de usuario' },
        { q: '¿Cómo elimino mi cuenta?', a: 'Ve a Configuración → Cuenta → Eliminar cuenta' },
      ],
    },
    {
      id: 'streaming',
      title: 'Streaming en Vivo',
      icon: '📺',
      description: 'Problemas con transmisiones, OBS, configuración',
      faqs: [
        { q: '¿Cómo configuro OBS para transmitir?', a: 'Ve a Dashboard → Configurar Stream y copia la URL del servidor y Stream Key' },
        { q: '¿Por qué mi stream no se ve en vivo?', a: 'Verificá que tu Stream Key sea correcta y que OBS esté transmitiendo' },
        { q: '¿Cómo cambio el título de mi stream?', a: 'Ve a Dashboard → Configurar Stream → Título' },
        { q: '¿Qué resolución y bitrate recomiendan?', a: 'Para 720p: 3500-5000 Kbps. Para 1080p: 6000-8000 Kbps' },
      ],
    },
    {
      id: 'chat',
      title: 'Chat y Moderación',
      icon: '💬',
      description: 'Problemas con el chat, moderación, bans',
      faqs: [
        { q: '¿Cómo moderar mi chat?', a: 'Hacé clic en un mensaje para ver opciones de moderación' },
        { q: '¿Cómo activo el slow mode?', a: 'Ve a Dashboard → Controles del Chat → Slow Mode' },
        { q: '¿Cómo banneo a un usuario?', a: 'Hacé clic en el mensaje del usuario → Banear' },
        { q: '¿Cómo agrego un moderador?', a: 'Ve a Dashboard → Moderadores → Agregar moderador' },
      ],
    },
    {
      id: 'payments',
      title: 'Pagos y Suscripciones',
      icon: '💳',
      description: 'Problemas con pagos, suscripciones, donaciones',
      faqs: [
        { q: '¿Cómo me suscribo a un canal?', a: 'Ve al canal del creador → Suscribirse' },
        { q: '¿Cómo cancelo mi suscripción?', a: 'Ve a Configuración → Suscripciones → Cancelar' },
        { q: '¿Cómo hago una donación?', a: 'Ve al canal del creador → Donar' },
        { q: '¿Cuándo recibo mis pagos?', a: 'Los pagos se procesan mensualmente después de alcanzar el mínimo' },
      ],
    },
    {
      id: 'content',
      title: 'Videos y Clips',
      icon: '🎬',
      description: 'Problemas con videos, clips, VOD',
      faqs: [
        { q: '¿Dónde encuentro mis videos?', a: 'Ve a Dashboard → Videos' },
        { q: '¿Cómo creo un clip?', a: 'Durante un stream o video, hacé clic en "Crear Clip"' },
        { q: '¿Por qué mi video no se procesa?', a: 'El procesamiento puede tardar varios minutos. Si persiste, contactá soporte' },
        { q: '¿Cómo elimino un video?', a: 'Ve a Dashboard → Videos → Eliminar' },
      ],
    },
    {
      id: 'security',
      title: 'Seguridad y Privacidad',
      icon: '🔒',
      description: 'Problemas de seguridad, privacidad, 2FA',
      faqs: [
        { q: '¿Cómo activo 2FA?', a: 'Ve a Configuración → Seguridad → Autenticación de Dos Factores' },
        { q: '¿Qué hago si mi cuenta fue comprometida?', a: 'Cambiá tu contraseña inmediatamente y contactá soporte' },
        { q: '¿Cómo reporto contenido inapropiado?', a: 'Hacé clic en el botón de reportar junto al contenido' },
        { q: '¿Cómo exporto mis datos?', a: 'Ve a Configuración → Privacidad → Exportar datos' },
      ],
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-text-secondary hover:text-white mb-8">
        <ArrowLeft className="w-4 h-4" />
        Volver al inicio
      </Link>

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Centro de Soporte</h1>
        <p className="text-xl text-text-secondary mb-8">
          ¿Necesitás ayuda? Estamos aquí para asistirte.
        </p>
      </div>

      {/* Quick Contact */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="bg-bg-card border border-border rounded-xl p-6 text-center">
          <MessageCircle className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Chat en Vivo</h3>
          <p className="text-text-secondary text-sm mb-4">
            Hablá con nuestro equipo de soporte en tiempo real
          </p>
          <button className="w-full px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors">
            Iniciar Chat
          </button>
        </div>

        <div className="bg-bg-card border border-border rounded-xl p-6 text-center">
          <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Email</h3>
          <p className="text-text-secondary text-sm mb-4">
            Enviános un email y te responderemos en 24 horas
          </p>
          <a
            href="mailto:soporte@nexura.example"
            className="w-full inline-block px-4 py-2 bg-bg-elevated hover:bg-bg-input text-white rounded-lg transition-colors"
          >
            soporte@nexura.example
          </a>
        </div>

        <div className="bg-bg-card border border-border rounded-xl p-6 text-center">
          <Book className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Documentación</h3>
          <p className="text-text-secondary text-sm mb-4">
            Explorá nuestras guías y tutoriales detallados
          </p>
          <a
            href="/docs"
            className="w-full inline-block px-4 py-2 bg-bg-elevated hover:bg-bg-input text-white rounded-lg transition-colors"
          >
            Ver Documentación
          </a>
        </div>
      </div>

      {/* Categories */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">Preguntas Frecuentes por Categoría</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
              className={`bg-bg-card border rounded-xl p-6 text-left transition-all ${
                selectedCategory === category.id
                  ? 'border-primary'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="text-4xl mb-3">{category.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{category.title}</h3>
              <p className="text-text-secondary text-sm">{category.description}</p>
            </button>
          ))}
        </div>

        {/* FAQ Section */}
        {selectedCategory && (
          <div className="mt-8 bg-bg-card border border-border rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">
              {categories.find(c => c.id === selectedCategory)?.title}
            </h3>
            <div className="space-y-4">
              {categories.find(c => c.id === selectedCategory)?.faqs.map((faq, index) => (
                <div key={index} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <h4 className="text-white font-medium mb-2 flex items-start gap-2">
                    <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    {faq.q}
                  </h4>
                  <p className="text-text-secondary ml-7">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Report Issue */}
      <div className="bg-bg-card border border-border rounded-xl p-8 mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">¿No encontrás lo que buscás?</h2>
        <p className="text-text-secondary mb-6">
          Si tu problema no está listado en las preguntas frecuentes, podés enviar un ticket de soporte.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Reportar un Problema
            </h3>
            <p className="text-text-secondary text-sm mb-3">
              ¿Encontraste un bug o algo no funciona como debería?
            </p>
            <button className="w-full px-4 py-2 bg-warning/10 hover:bg-warning/20 text-warning border border-warning/20 rounded-lg transition-colors">
              Reportar Problema
            </button>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              Solicitar Funcionalidad
            </h3>
            <p className="text-text-secondary text-sm mb-3">
              ¿Tenés una idea para mejorar NEXURA?
            </p>
            <button className="w-full px-4 py-2 bg-success/10 hover:bg-success/20 text-success border border-success/20 rounded-lg transition-colors">
              Enviar Sugerencia
            </button>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="bg-bg-card border border-border rounded-xl p-8">
        <h2 className="text-2xl font-bold text-white mb-4">Estado del Sistema</h2>
        <p className="text-text-secondary mb-6">
          Verificá el estado actual de todos los servicios de NEXURA.
        </p>
        <Link
          to="/status"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
        >
          Ver Estado del Sistema
          <ArrowLeft className="w-4 h-4 rotate-180" />
        </Link>
      </div>
    </div>
  );
}
