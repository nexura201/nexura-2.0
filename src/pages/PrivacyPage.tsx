import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-text-secondary hover:text-white mb-8">
        <ArrowLeft className="w-4 h-4" />
        Volver al inicio
      </Link>

      <div className="bg-bg-card border border-border rounded-xl p-8">
        <h1 className="text-3xl font-bold text-white mb-6">Política de Privacidad</h1>
        
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-8">
          <p className="text-warning text-sm">
            <strong>⚠️ AVISO LEGAL:</strong> Este es un documento de ejemplo. Debe ser revisado y aprobado por un abogado antes de su uso en producción.
          </p>
        </div>

        <div className="prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">1. Introducción</h2>
            <p className="text-text-secondary mb-4">
              En NEXURA, respetamos tu privacidad y nos comprometemos a proteger tus datos personales. Esta política explica cómo recopilamos, usamos y protegemos tu información.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">2. Información que Recopilamos</h2>
            <p className="text-text-secondary mb-4">Recopilamos los siguientes tipos de información:</p>
            
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">Información de la cuenta</h3>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li>Nombre de usuario y dirección de email</li>
              <li>Contraseña (almacenada de forma segura con hash)</li>
              <li>Información de perfil (avatar, banner, biografía)</li>
              <li>Preferencias de configuración</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-4 mb-2">Información de uso</h3>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li>Historial de visualización de streams y videos</li>
              <li>Canales seguidos</li>
              <li>Mensajes de chat</li>
              <li>Interacciones (me gusta, comentarios)</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-4 mb-2">Información técnica</h3>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li>Dirección IP</li>
              <li>Tipo de navegador y sistema operativo</li>
              <li>Dispositivos utilizados</li>
              <li>Datos de rendimiento y errores</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-4 mb-2">Información de pago</h3>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li>Historial de transacciones</li>
              <li>Información de suscripciones</li>
              <li>Datos de donaciones</li>
            </ul>
            <p className="text-text-secondary mt-2">
              <strong>Nota:</strong> No almacenamos información de tarjetas de crédito. Los pagos son procesados por proveedores externos seguros.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">3. Cómo Usamos tu Información</h2>
            <p className="text-text-secondary mb-4">Utilizamos tu información para:</p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li>Proporcionar y mejorar nuestros servicios</li>
              <li>Personalizar tu experiencia</li>
              <li>Procesar pagos y suscripciones</li>
              <li>Enviar notificaciones importantes</li>
              <li>Prevenir fraude y abuso</li>
              <li>Cumplir con obligaciones legales</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">4. Compartir Información</h2>
            <p className="text-text-secondary mb-4">
              No vendemos tu información personal. Podemos compartir información en las siguientes circunstancias:
            </p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li><strong>Proveedores de servicios:</strong> Procesadores de pago, servicios de email, hosting</li>
              <li><strong>Requisitos legales:</strong> Cuando sea requerido por ley o para proteger nuestros derechos</li>
              <li><strong>Con tu consentimiento:</strong> Cuando nos autorices explícitamente</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">5. Seguridad</h2>
            <p className="text-text-secondary mb-4">
              Implementamos medidas de seguridad técnicas y organizativas para proteger tu información:
            </p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li>Cifrado de datos en tránsito (HTTPS/TLS)</li>
              <li>Cifrado de datos en reposo</li>
              <li>Autenticación de dos factores</li>
              <li>Monitoreo de seguridad continuo</li>
              <li>Backups regulares</li>
              <li>Acceso restringido a datos personales</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">6. Tus Derechos</h2>
            <p className="text-text-secondary mb-4">
              Tenés derechos sobre tu información personal:
            </p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li><strong>Acceso:</strong> Solicitar una copia de tus datos</li>
              <li><strong>Rectificación:</strong> Corregir información inexacta</li>
              <li><strong>Eliminación:</strong> Solicitar la eliminación de tu cuenta y datos</li>
              <li><strong>Portabilidad:</strong> Recibir tus datos en formato estructurado</li>
              <li><strong>Oposición:</strong> Oponerte al procesamiento de tus datos</li>
              <li><strong>Restricción:</strong> Solicitar la limitación del procesamiento</li>
            </ul>
            <p className="text-text-secondary mt-4">
              Para ejercer estos derechos, contactanos en{' '}
              <a href="mailto:privacidad@nexura.example" className="text-primary hover:text-primary-hover">
                privacidad@nexura.example
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">7. Retención de Datos</h2>
            <p className="text-text-secondary mb-4">
              Conservamos tu información mientras tu cuenta esté activa o según sea necesario para proporcionar servicios. Después de la eliminación de la cuenta:
            </p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li>Datos personales: eliminados en 30 días</li>
              <li>Datos de transacciones: conservados por requisitos legales (7 años)</li>
              <li>Logs del sistema: conservados por 90 días</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">8. Cookies</h2>
            <p className="text-text-secondary mb-4">
              Utilizamos cookies para mejorar tu experiencia. Consultá nuestra{' '}
              <Link to="/cookies" className="text-primary hover:text-primary-hover">
                Política de Cookies
              </Link>{' '}
              para más detalles.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">9. Menores de Edad</h2>
            <p className="text-text-secondary mb-4">
              NEXURA no está dirigido a menores de 13 años. No recopilamos intencionalmente información de menores de 13 años. Si creés que un menor nos ha proporcionado datos personales, contactanos inmediatamente.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">10. Cambios en esta Política</h2>
            <p className="text-text-secondary mb-4">
              Podemos actualizar esta política periódicamente. Te notificaremos sobre cambios significativos mediante email o notificaciones en la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">11. Contacto</h2>
            <p className="text-text-secondary">
              Si tenés preguntas sobre esta política o sobre el tratamiento de tus datos, contactanos:
            </p>
            <ul className="list-none text-text-secondary space-y-2 ml-4 mt-4">
              <li>Email: <a href="mailto:privacidad@nexura.example" className="text-primary hover:text-primary-hover">privacidad@nexura.example</a></li>
              <li>Dirección: [Dirección física de la empresa]</li>
              <li>Delegado de Protección de Datos: [Nombre y contacto]</li>
            </ul>
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
