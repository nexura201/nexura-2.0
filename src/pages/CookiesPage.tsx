import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function CookiesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-text-secondary hover:text-white mb-8">
        <ArrowLeft className="w-4 h-4" />
        Volver al inicio
      </Link>

      <div className="bg-bg-card border border-border rounded-xl p-8">
        <h1 className="text-3xl font-bold text-white mb-6">Política de Cookies</h1>
        
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-8">
          <p className="text-warning text-sm">
            <strong>⚠️ AVISO LEGAL:</strong> Este es un documento de ejemplo. Debe ser revisado y aprobado por un abogado antes de su uso en producción.
          </p>
        </div>

        <div className="prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">¿Qué son las Cookies?</h2>
            <p className="text-text-secondary mb-4">
              Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitás un sitio web. Son ampliamente utilizadas para hacer que los sitios web funcionen de manera más eficiente y proporcionar información a los propietarios del sitio.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Cómo Usamos las Cookies</h2>
            <p className="text-text-secondary mb-4">
              NEXURA utiliza cookies para las siguientes finalidades:
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">1. Cookies Esenciales</h3>
            <p className="text-text-secondary mb-4">
              Estas cookies son necesarias para que el sitio web funcione correctamente. No se pueden desactivar.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-text-secondary border border-border rounded-lg">
                <thead className="bg-bg-elevated">
                  <tr>
                    <th className="text-left p-3 border-b border-border">Nombre</th>
                    <th className="text-left p-3 border-b border-border">Propósito</th>
                    <th className="text-left p-3 border-b border-border">Duración</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 border-b border-border font-mono text-xs">nexura_session</td>
                    <td className="p-3 border-b border-border">Mantener tu sesión iniciada</td>
                    <td className="p-3 border-b border-border">7 días</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-b border-border font-mono text-xs">nexura_csrf</td>
                    <td className="p-3 border-b border-border">Protección contra ataques CSRF</td>
                    <td className="p-3 border-b border-border">Sesión</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-xs">nexura_auth</td>
                    <td className="p-3">Autenticación de usuario</td>
                    <td className="p-3">7 días</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">2. Cookies de Preferencias</h3>
            <p className="text-text-secondary mb-4">
              Estas cookies permiten que el sitio recuerde tus preferencias y configuraciones.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-text-secondary border border-border rounded-lg">
                <thead className="bg-bg-elevated">
                  <tr>
                    <th className="text-left p-3 border-b border-border">Nombre</th>
                    <th className="text-left p-3 border-b border-border">Propósito</th>
                    <th className="text-left p-3 border-b border-border">Duración</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 border-b border-border font-mono text-xs">nexura_theme</td>
                    <td className="p-3 border-b border-border">Recordar tu preferencia de tema (claro/oscuro)</td>
                    <td className="p-3 border-b border-border">1 año</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-b border-border font-mono text-xs">nexura_language</td>
                    <td className="p-3 border-b border-border">Recordar tu idioma preferido</td>
                    <td className="p-3 border-b border-border">1 año</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-xs">nexura_chat_settings</td>
                    <td className="p-3">Configuraciones de chat</td>
                    <td className="p-3">1 año</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">3. Cookies de Análisis</h3>
            <p className="text-text-secondary mb-4">
              Estas cookies nos ayudan a entender cómo los visitantes interactúan con el sitio web.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-text-secondary border border-border rounded-lg">
                <thead className="bg-bg-elevated">
                  <tr>
                    <th className="text-left p-3 border-b border-border">Nombre</th>
                    <th className="text-left p-3 border-b border-border">Propósito</th>
                    <th className="text-left p-3 border-b border-border">Duración</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 border-b border-border font-mono text-xs">nexura_analytics</td>
                    <td className="p-3 border-b border-border">Rastrear métricas de uso anónimas</td>
                    <td className="p-3 border-b border-border">2 años</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-xs">nexura_performance</td>
                    <td className="p-3">Medir el rendimiento del sitio</td>
                    <td className="p-3">1 año</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">4. Cookies de Terceros</h3>
            <p className="text-text-secondary mb-4">
              Algunos servicios de terceros que utilizamos pueden establecer sus propias cookies:
            </p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li><strong>Proveedores de pago:</strong> Para procesar transacciones seguras</li>
              <li><strong>Servicios de video:</strong> Para optimizar la entrega de contenido</li>
              <li><strong>CDN:</strong> Para mejorar el rendimiento</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Gestión de Cookies</h2>
            <p className="text-text-secondary mb-4">
              Podés controlar y/o eliminar las cookies como desees. Para más información, visitá{' '}
              <a href="https://www.aboutcookies.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover">
                aboutcookies.org
              </a>
              .
            </p>
            <p className="text-text-secondary mb-4">
              Podés eliminar todas las cookies que ya están en tu dispositivo y configurar la mayoría de los navegadores para que no las acepten. Sin embargo, si hacés esto, es posible que debas ajustar manualmente algunas preferencias cada vez que visités nuestro sitio y que algunos servicios y funcionalidades no funcionen.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">Cómo eliminar cookies en tu navegador:</h3>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li><strong>Chrome:</strong> Configuración → Privacidad y seguridad → Cookies</li>
              <li><strong>Firefox:</strong> Opciones → Privacidad y seguridad → Cookies</li>
              <li><strong>Safari:</strong> Preferencias → Privacidad → Cookies</li>
              <li><strong>Edge:</strong> Configuración → Cookies y permisos del sitio</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Consentimiento de Cookies</h2>
            <p className="text-text-secondary mb-4">
              Cuando visitás NEXURA por primera vez, te mostramos un banner de cookies que te permite:
            </p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li>Aceptar todas las cookies</li>
              <li>Rechazar las cookies no esenciales</li>
              <li>Personalizar tus preferencias de cookies</li>
            </ul>
            <p className="text-text-secondary mt-4">
              Podés cambiar tus preferencias en cualquier momento desde la configuración de tu cuenta.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Cambios en esta Política</h2>
            <p className="text-text-secondary mb-4">
              Podemos actualizar esta política de cookies periódicamente. Te notificaremos sobre cambios significativos mediante un aviso en el sitio web.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Contacto</h2>
            <p className="text-text-secondary">
              Si tenés preguntas sobre nuestra política de cookies, contactanos en{' '}
              <a href="mailto:privacidad@nexura.example" className="text-primary hover:text-primary-hover">
                privacidad@nexura.example
              </a>
            </p>
          </section>
        </div>

        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-sm text-text-muted">
            Última actualización: Enero 2024
          </p>
        </div>
      </div>
    </div>
  );
}
