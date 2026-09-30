import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function ContentPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-text-secondary hover:text-white mb-8">
        <ArrowLeft className="w-4 h-4" />
        Volver al inicio
      </Link>

      <div className="bg-bg-card border border-border rounded-xl p-8">
        <h1 className="text-3xl font-bold text-white mb-6">Política de Contenido</h1>
        
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-8">
          <p className="text-warning text-sm">
            <strong>⚠️ AVISO LEGAL:</strong> Este es un documento de ejemplo. Debe ser revisado y aprobado por un abogado antes de su uso en producción.
          </p>
        </div>

        <div className="prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">1. Contenido Permitido</h2>
            <p className="text-text-secondary mb-4">
              NEXURA permite una amplia variedad de contenido, siempre que cumpla con nuestras{' '}
              <Link to="/community-guidelines" className="text-primary hover:text-primary-hover">
                Directrices de la Comunidad
              </Link>{' '}
              y esta política.
            </p>
            <p className="text-text-secondary mb-4">
              Contenido permitido incluye, pero no se limita a:
            </p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li>Streams de videojuegos</li>
              <li>Charlas y podcasts en vivo</li>
              <li>Música y performances</li>
              <li>Arte y creatividad</li>
              <li>Educación y tutoriales</li>
              <li>Deportes y fitness</li>
              <li>Contenido de tecnología</li>
              <li>Cocina y gastronomía</li>
              <li>Viajes y exploración</li>
              <li>Contenido de entretenimiento general</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">2. Clasificación de Contenido</h2>
            <p className="text-text-secondary mb-4">
              Todo contenido en NEXURA debe ser clasificado adecuadamente:
            </p>

            <div className="space-y-4">
              <div className="bg-bg-elevated rounded-lg p-4">
                <h3 className="text-lg font-semibold text-success mb-2">🟢 Contenido General</h3>
                <p className="text-text-secondary text-sm">
                  Apto para todas las edades. No contiene lenguaje fuerte, violencia, o temas maduros.
                </p>
              </div>

              <div className="bg-bg-elevated rounded-lg p-4">
                <h3 className="text-lg font-semibold text-warning mb-2">🟡 Contenido para Adolescentes</h3>
                <p className="text-text-secondary text-sm">
                  Puede contener lenguaje moderado, violencia de fantasía, o temas maduros leves. Recomendado para mayores de 13 años.
                </p>
              </div>

              <div className="bg-bg-elevated rounded-lg p-4">
                <h3 className="text-lg font-semibold text-danger mb-2">🔴 Contenido para Adultos</h3>
                <p className="text-text-secondary text-sm">
                  Puede contener lenguaje fuerte, violencia realista, o temas maduros. Solo para mayores de 18 años. Debe estar marcado apropiadamente.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">3. Contenido Restringido</h2>
            <p className="text-text-secondary mb-4">
              El siguiente contenido está permitido pero requiere marcación especial:
            </p>

            <div className="space-y-4">
              <div className="bg-bg-elevated rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">🎮 Juegos con Clasificación Mature</h3>
                <p className="text-text-secondary text-sm">
                  Juegos clasificados como M (Mature) o PEGI 18+ deben ser marcados como contenido para adultos.
                </p>
              </div>

              <div className="bg-bg-elevated rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">💬 Discusión de Temas Maduros</h3>
                <p className="text-text-secondary text-sm">
                  Discusiones sobre política, religión, sexualidad, u otros temas maduros deben ser marcadas apropiadamente.
                </p>
              </div>

              <div className="bg-bg-elevated rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">🎭 Contenido de Horror o Terror</h3>
                <p className="text-text-secondary text-sm">
                  Contenido que pueda ser perturbador o causar ansiedad debe ser marcado con advertencias.
                </p>
              </div>

              <div className="bg-bg-elevated rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">🍷 Consumo de Alcohol o Tabaco</h3>
                <p className="text-text-secondary text-sm">
                  Contenido que muestre consumo de alcohol o tabaco debe ser marcado como contenido para adultos.
                </p>
              </div>

              <div className="bg-bg-elevated rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">🎲 Apuestas y Juegos de Azar</h3>
                <p className="text-text-secondary text-sm">
                  Contenido relacionado con apuestas debe ser marcado y cumplir con las leyes locales.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">4. Contenido Prohibido</h2>
            <p className="text-text-secondary mb-4">
              El siguiente contenido está estrictamente prohibido y resultará en la eliminación del contenido y posibles acciones contra la cuenta:
            </p>

            <div className="space-y-4">
              <div className="bg-danger/10 border border-danger/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-danger mb-2">🔞 Pornografía y Contenido Sexual Explícito</h3>
                <p className="text-text-secondary text-sm">
                  No se permite contenido sexual explícito, pornografía, o desnudez gratuita.
                </p>
              </div>

              <div className="bg-danger/10 border border-danger/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-danger mb-2">👶 Explotación de Menores</h3>
                <p className="text-text-secondary text-sm">
                  Tolerancia cero con cualquier contenido que explote o dañe a menores. Se reportará a las autoridades.
                </p>
              </div>

              <div className="bg-danger/10 border border-danger/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-danger mb-2">⚔️ Violencia Extrema o Gore</h3>
                <p className="text-text-secondary text-sm">
                  No se permite violencia gráfica extrema, gore, o contenido que promueva la violencia.
                </p>
              </div>

              <div className="bg-danger/10 border border-danger/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-danger mb-2">💀 Autolesión o Suicidio</h3>
                <p className="text-text-secondary text-sm">
                  No se permite contenido que promueva, glorifique o instruya sobre autolesiones o suicidio.
                </p>
              </div>

              <div className="bg-danger/10 border border-danger/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-danger mb-2">🎭 Discurso de Odio</h3>
                <p className="text-text-secondary text-sm">
                  No se permite contenido que ataque, degrade o incite odio contra personas por raza, etnia, religión, género, orientación sexual, discapacidad, u otras características protegidas.
                </p>
              </div>

              <div className="bg-danger/10 border border-danger/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-danger mb-2">🚨 Actividades Ilegales</h3>
                <p className="text-text-secondary text-sm">
                  No se permite contenido que promueva, instruya o facilite actividades ilegales, incluyendo venta de drogas, armas, o información para cometer crímenes.
                </p>
              </div>

              <div className="bg-danger/10 border border-danger/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-danger mb-2">🎬 Violación de Derechos de Autor</h3>
                <p className="text-text-secondary text-sm">
                  No se permite contenido que viole derechos de autor sin permiso o licencia adecuada. Esto incluye películas, música, software, y otros materiales protegidos.
                </p>
              </div>

              <div className="bg-danger/10 border border-danger/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-danger mb-2">🎯 Spam y Scams</h3>
                <p className="text-text-secondary text-sm">
                  No se permite spam, scams, phishing, esquemas piramidales, o cualquier forma de fraude.
                </p>
              </div>

              <div className="bg-danger/10 border border-danger/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-danger mb-2">🎭 Suplantación de Identidad</h3>
                <p className="text-text-secondary text-sm">
                  No se permite hacerse pasar por otra persona, marca, o entidad.
                </p>
              </div>

              <div className="bg-danger/10 border border-danger/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-danger mb-2">🔍 Doxing</h3>
                <p className="text-text-secondary text-sm">
                  No se permite revelar información privada de otras personas sin su consentimiento.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">5. Derechos de Autor y Propiedad Intelectual</h2>
            <p className="text-text-secondary mb-4">
              NEXURA respeta los derechos de propiedad intelectual. Como creador:
            </p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li>Sos responsable de asegurar que tenés los derechos o permisos para todo el contenido que transmitís o subís</li>
              <li>El uso justo (fair use) puede aplicar en algunos casos, pero es tu responsabilidad evaluarlo</li>
              <li>Si recibís una reclamación de derechos de autor, debés responder apropiadamente</li>
              <li>Las violaciones repetidas pueden resultar en la terminación de tu cuenta</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">Proceso de DMCA</h3>
            <p className="text-text-secondary mb-4">
              Si creés que tu contenido ha sido utilizado sin autorización, podés enviar una notificación DMCA a{' '}
              <a href="mailto:copyright@nexura.example" className="text-primary hover:text-primary-hover">
                copyright@nexura.example
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">6. Marcación de Contenido</h2>
            <p className="text-text-secondary mb-4">
              Los creadores deben marcar apropiadamente su contenido:
            </p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li><strong>Clasificación por edad:</strong> General, Adolescentes, o Adultos</li>
              <li><strong>Contenido sensible:</strong> Marcar contenido que pueda ser perturbador</li>
              <li><strong>Idioma:</strong> Especificar el idioma principal del stream</li>
              <li><strong>Categoría:</strong> Seleccionar la categoría apropiada</li>
              <li><strong>Tags:</strong> Agregar tags relevantes para el contenido</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">7. Moderación de Contenido</h2>
            <p className="text-text-secondary mb-4">
              NEXURA utiliza un sistema de moderación combinado:
            </p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li><strong>Moderación automatizada:</strong> Detección de contenido prohibido</li>
              <li><strong>Reportes de usuarios:</strong> La comunidad reporta contenido inapropiado</li>
              <li><strong>Moderadores humanos:</strong> Revisión de reportes y contenido flagged</li>
              <li><strong>Moderadores de canal:</strong> Creadores y sus moderadores gestionan su propio contenido</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">8. Consecuencias por Violaciones</h2>
            <p className="text-text-secondary mb-4">
              Las violaciones de esta política pueden resultar en:
            </p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li>Eliminación del contenido</li>
              <li>Advertencia formal</li>
              <li>Suspensión temporal de la cuenta</li>
              <li>Restricción de funcionalidades</li>
              <li>Baneo permanente de la plataforma</li>
              <li>Reporte a autoridades (en casos de contenido ilegal)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">9. Apelaciones</h2>
            <p className="text-text-secondary mb-4">
              Si creés que tu contenido fue eliminado o tu cuenta fue sancionada injustamente, podés apelar:
            </p>
            <ol className="list-decimal list-inside text-text-secondary space-y-2 ml-4">
              <li>Accedé a tu panel de moderación</li>
              <li>Seleccioná la acción que querés apelar</li>
              <li>Proporcioná una explicación detallada</li>
              <li>Enviá tu apelación</li>
            </ol>
            <p className="text-text-secondary mt-4">
              Las apelaciones son revisadas por un moderador diferente al que tomó la acción original.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. Contacto</h2>
            <p className="text-text-secondary">
              Si tenés preguntas sobre esta política, contactanos en{' '}
              <a href="mailto:contenido@nexura.example" className="text-primary hover:text-primary-hover">
                contenido@nexura.example
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
