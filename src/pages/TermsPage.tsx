import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-text-secondary hover:text-white mb-8">
        <ArrowLeft className="w-4 h-4" />
        Volver al inicio
      </Link>

      <div className="bg-bg-card border border-border rounded-xl p-8">
        <h1 className="text-3xl font-bold text-white mb-6">Términos de Servicio</h1>
        
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-8">
          <p className="text-warning text-sm">
            <strong>⚠️ AVISO LEGAL:</strong> Este es un documento de ejemplo. Debe ser revisado y aprobado por un abogado antes de su uso en producción.
          </p>
        </div>

        <div className="prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">1. Aceptación de los Términos</h2>
            <p className="text-text-secondary mb-4">
              Al acceder y utilizar NEXURA, aceptás cumplir con estos Términos de Servicio. Si no estás de acuerdo con alguna parte de estos términos, no podés utilizar la plataforma.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">2. Descripción del Servicio</h2>
            <p className="text-text-secondary mb-4">
              NEXURA es una plataforma de streaming en vivo que permite a los creadores transmitir contenido, interactuar con su audiencia mediante chat en tiempo real, y monetizar su contenido a través de suscripciones y donaciones.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">3. Cuentas de Usuario</h2>
            <p className="text-text-secondary mb-4">
              Para utilizar ciertas funcionalidades, debés crear una cuenta. Sos responsable de mantener la confidencialidad de tu cuenta y contraseña, y de todas las actividades que ocurran bajo tu cuenta.
            </p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li>Debés tener al menos 13 años para crear una cuenta</li>
              <li>Debés proporcionar información veraz y completa</li>
              <li>Debés notificar inmediatamente sobre cualquier uso no autorizado</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">4. Contenido del Usuario</h2>
            <p className="text-text-secondary mb-4">
              Conservás todos los derechos sobre el contenido que transmitís o subís a NEXURA. Al utilizar la plataforma, nos otorgás una licencia para alojar, mostrar y distribuir tu contenido.
            </p>
            <p className="text-text-secondary mb-4">
              No podés subir contenido que:
            </p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li>Viole derechos de autor o propiedad intelectual</li>
              <li>Sea ilegal, obsceno o difamatorio</li>
              <li>Contenga malware o código malicioso</li>
              <li>Viola la privacidad de terceros</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">5. Monetización</h2>
            <p className="text-text-secondary mb-4">
              NEXURA ofrece funcionalidades de monetización para creadores, incluyendo suscripciones y donaciones. Las comisiones de la plataforma se detallan en la sección de monetización del dashboard.
            </p>
            <p className="text-text-secondary mb-4">
              Los pagos se procesan a través de proveedores de pago de terceros. Al utilizar estas funcionalidades, aceptás los términos de dichos proveedores.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">6. Moderación</h2>
            <p className="text-text-secondary mb-4">
              NEXURA se reserva el derecho de moderar contenido y cuentas que violen estos términos o nuestras directrices de comunidad. Esto incluye:
            </p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li>Eliminar contenido inapropiado</li>
              <li>Suspender o banear cuentas</li>
              <li>Restringir funcionalidades</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">7. Limitación de Responsabilidad</h2>
            <p className="text-text-secondary mb-4">
              NEXURA se proporciona "tal cual" sin garantías de ningún tipo. No somos responsables de:
            </p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li>Interrupciones del servicio</li>
              <li>Pérdida de datos o contenido</li>
              <li>Daños derivados del uso de la plataforma</li>
              <li>Contenido generado por usuarios</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">8. Modificaciones</h2>
            <p className="text-text-secondary mb-4">
              Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor inmediatamente después de su publicación. El uso continuado de la plataforma constituye la aceptación de los términos modificados.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">9. Ley Aplicable</h2>
            <p className="text-text-secondary mb-4">
              Estos términos se rigen por las leyes aplicables en tu jurisdicción. Cualquier disputa será resuelta en los tribunales competentes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. Contacto</h2>
            <p className="text-text-secondary">
              Si tenés preguntas sobre estos términos, contactanos en{' '}
              <a href="mailto:legal@nexura.example" className="text-primary hover:text-primary-hover">
                legal@nexura.example
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
