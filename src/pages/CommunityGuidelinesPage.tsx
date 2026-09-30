import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function CommunityGuidelinesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-text-secondary hover:text-white mb-8">
        <ArrowLeft className="w-4 h-4" />
        Volver al inicio
      </Link>

      <div className="bg-bg-card border border-border rounded-xl p-8">
        <h1 className="text-3xl font-bold text-white mb-6">Directrices de la Comunidad</h1>
        
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-8">
          <p className="text-primary text-sm">
            <strong>🎯 Nuestra misión:</strong> Crear una comunidad inclusiva, respetuosa y creativa donde todos puedan compartir y disfrutar contenido de calidad.
          </p>
        </div>

        <div className="prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Principios Fundamentales</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-bg-elevated rounded-lg p-4">
                <h3 className="text-lg font-semibold text-primary mb-2">🤝 Respeto</h3>
                <p className="text-text-secondary text-sm">
                  Tratá a todos con respeto y dignidad. No toleramos el acoso, la discriminación o el discurso de odio.
                </p>
              </div>
              <div className="bg-bg-elevated rounded-lg p-4">
                <h3 className="text-lg font-semibold text-primary mb-2">🎨 Creatividad</h3>
                <p className="text-text-secondary text-sm">
                  Fomentamos la expresión creativa y el contenido original. Celebramos la diversidad de perspectivas.
                </p>
              </div>
              <div className="bg-bg-elevated rounded-lg p-4">
                <h3 className="text-lg font-semibold text-primary mb-2">🛡️ Seguridad</h3>
                <p className="text-text-secondary text-sm">
                  La seguridad de nuestra comunidad es prioritaria. Protegemos a los usuarios de contenido dañino.
                </p>
              </div>
              <div className="bg-bg-elevated rounded-lg p-4">
                <h3 className="text-lg font-semibold text-primary mb-2">📚 Transparencia</h3>
                <p className="text-text-secondary text-sm">
                  Somos transparentes sobre nuestras reglas y acciones de moderación.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Comportamiento Esperado</h2>
            <p className="text-text-secondary mb-4">Esperamos que todos los miembros de la comunidad:</p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li>Sean respetuosos con otros usuarios, creadores y moderadores</li>
              <li>Participen de manera constructiva en chats y comentarios</li>
              <li>Respeten la privacidad de otros usuarios</li>
              <li>Reporten contenido o comportamiento inapropiado</li>
              <li>Sigan las instrucciones de los moderadores</li>
              <li>Contribuyan positivamente a la comunidad</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Comportamiento Inaceptable</h2>
            <p className="text-text-secondary mb-4">Las siguientes acciones resultarán en acciones de moderación:</p>

            <h3 className="text-lg font-semibold text-danger mt-6 mb-3">🚫 Violaciones Graves (Ban permanente)</h3>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li>Acoso severo o amenazas</li>
              <li>Discurso de odio o discriminación</li>
              <li>Contenido sexual que involucre menores</li>
              <li>Doxing (revelar información privada)</li>
              <li>Suplantación de identidad</li>
              <li>Actividades ilegales</li>
              <li>Spam malicioso o ataques</li>
            </ul>

            <h3 className="text-lg font-semibold text-warning mt-6 mb-3">⚠️ Violaciones Moderadas (Suspensión temporal)</h3>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li>Acoso leve o comportamiento tóxico</li>
              <li>Spam o flood</li>
              <li>Contenido inapropiado para menores</li>
              <li>Violación de derechos de autor</li>
              <li>Publicidad no autorizada</li>
              <li>Contenido engañoso o fraudulento</li>
            </ul>

            <h3 className="text-lg font-semibold text-text-secondary mt-6 mb-3">📝 Violaciones Menores (Advertencia)</h3>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li>Lenguaje inapropiado leve</li>
              <li>Off-topic persistente</li>
              <li>Falta de respeto menor</li>
              <li>Violaciones menores de las reglas</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Contenido Prohibido</h2>
            <p className="text-text-secondary mb-4">No se permite el siguiente contenido en NEXURA:</p>

            <div className="space-y-4">
              <div className="bg-bg-elevated rounded-lg p-4">
                <h3 className="text-lg font-semibold text-danger mb-2">🔞 Contenido para Adultos</h3>
                <p className="text-text-secondary text-sm">
                  Contenido sexual explícito, pornografía, desnudez gratuita.
                </p>
              </div>

              <div className="bg-bg-elevated rounded-lg p-4">
                <h3 className="text-lg font-semibold text-danger mb-2">⚔️ Violencia Extrema</h3>
                <p className="text-text-secondary text-sm">
                  Violencia gráfica, gore, contenido que promueva la violencia.
                </p>
              </div>

              <div className="bg-bg-elevated rounded-lg p-4">
                <h3 className="text-lg font-semibold text-danger mb-2">👶 Protección de Menores</h3>
                <p className="text-text-secondary text-sm">
                  Cualquier contenido que explote o dañe a menores. Tolerancia cero.
                </p>
              </div>

              <div className="bg-bg-elevated rounded-lg p-4">
                <h3 className="text-lg font-semibold text-danger mb-2">💀 Autolesión</h3>
                <p className="text-text-secondary text-sm">
                  Contenido que promueva o glorifique el suicidio o autolesiones.
                </p>
              </div>

              <div className="bg-bg-elevated rounded-lg p-4">
                <h3 className="text-lg font-semibold text-danger mb-2">🎭 Discurso de Odio</h3>
                <p className="text-text-secondary text-sm">
                  Contenido que ataque a personas por raza, etnia, religión, género, orientación sexual, discapacidad, etc.
                </p>
              </div>

              <div className="bg-bg-elevated rounded-lg p-4">
                <h3 className="text-lg font-semibold text-danger mb-2">🚨 Contenido Ilegal</h3>
                <p className="text-text-secondary text-sm">
                  Contenido que promueva actividades ilegales, venta de drogas, armas, etc.
                </p>
              </div>

              <div className="bg-bg-elevated rounded-lg p-4">
                <h3 className="text-lg font-semibold text-warning mb-2">🎬 Derechos de Autor</h3>
                <p className="text-text-secondary text-sm">
                  Contenido que viole derechos de autor sin permiso o licencia adecuada.
                </p>
              </div>

              <div className="bg-bg-elevated rounded-lg p-4">
                <h3 className="text-lg font-semibold text-warning mb-2">🎯 Spam y Manipulación</h3>
                <p className="text-text-secondary text-sm">
                  Spam, scams, phishing, manipulación de métricas, bots no autorizados.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Directrices para Creadores</h2>
            <p className="text-text-secondary mb-4">Como creador en NEXURA, debés:</p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li>Moderar activamente tu chat y contenido</li>
              <li>Establecer reglas claras para tu comunidad</li>
              <li>Asignar moderadores de confianza</li>
              <li>Reportar contenido inapropiado</li>
              <li>No promover contenido prohibido</li>
              <li>Respetar los derechos de autor</li>
              <li>Ser transparente sobre contenido patrocinado</li>
              <li>Proteger la privacidad de tus espectadores</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Proceso de Moderación</h2>
            
            <h3 className="text-lg font-semibold text-white mt-6 mb-3">Reportes</h3>
            <p className="text-text-secondary mb-4">
              Cualquier usuario puede reportar contenido o comportamiento inapropiado. Los reportes son revisados por nuestro equipo de moderación.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">Investigación</h3>
            <p className="text-text-secondary mb-4">
              Nuestro equipo investiga cada reporte, revisando el contexto y la evidencia proporcionada.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">Acciones</h3>
            <p className="text-text-secondary mb-4">
              Según la gravedad de la violación, podemos:
            </p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li>Emitir una advertencia</li>
              <li>Eliminar contenido</li>
              <li>Suspender temporalmente la cuenta</li>
              <li>Banear permanentemente la cuenta</li>
              <li>Restringir funcionalidades específicas</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">Apelaciones</h3>
            <p className="text-text-secondary mb-4">
              Si creés que una acción de moderación fue injusta, podés apelar a través del sistema de apelaciones. Tu caso será revisado por un moderador diferente.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Reportar Contenido</h2>
            <p className="text-text-secondary mb-4">
              Para reportar contenido o comportamiento inapropiado:
            </p>
            <ol className="list-decimal list-inside text-text-secondary space-y-2 ml-4">
              <li>Hacé clic en el botón de reportar junto al contenido o usuario</li>
              <li>Seleccioná la razón del reporte</li>
              <li>Proporcioná detalles adicionales si es necesario</li>
              <li>Enviá el reporte</li>
            </ol>
            <p className="text-text-secondary mt-4">
              También podés contactar directamente a nuestro equipo de soporte en{' '}
              <a href="mailto:soporte@nexura.example" className="text-primary hover:text-primary-hover">
                soporte@nexura.example
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Contacto</h2>
            <p className="text-text-secondary">
              Si tenés preguntas sobre estas directrices, contactanos en{' '}
              <a href="mailto:comunidad@nexura.example" className="text-primary hover:text-primary-hover">
                comunidad@nexura.example
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
