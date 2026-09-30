import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Radio, Users, MessageCircle, Shield, Zap, Globe,
  Play, ArrowRight, Star, TrendingUp, Monitor, Sparkles
} from 'lucide-react';

export function LandingPage() {
  const { user } = useAuth();

  if (user) {
    return <HomePage />;
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-600/10 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-72 h-72 bg-purple-400/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-6xl mx-auto px-4 pt-20 pb-32 text-center">
          <div className="inline-flex items-center gap-2 bg-purple-600/10 border border-purple-600/20 rounded-full px-4 py-1.5 mb-8">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-400">Plataforma gratuita para creadores</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Tu contenido.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-purple-300">
              Tu comunidad.
            </span>
            <br />En vivo.
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            NEXURA: Una nueva generación de streaming creada para creadores y comunidades. 
            Transmite, conecta y crece sin límites.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-8 py-3.5 rounded-xl text-lg font-medium transition-all hover:scale-105 shadow-lg shadow-purple-600/20"
            >
              Comenzar gratis <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/explore"
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-8 py-3.5 rounded-xl text-lg font-medium transition-all"
            >
              <Play className="w-5 h-5" /> Explorar streams
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-8 max-w-md mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">100%</div>
              <div className="text-sm text-gray-500">Gratis</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">0%</div>
              <div className="text-sm text-gray-500">Anuncios</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">∞</div>
              <div className="text-sm text-gray-500">Posibilidades</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Todo lo que necesitas para crecer
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Herramientas profesionales para creadores de todos los niveles.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Radio, title: 'Streaming en vivo', desc: 'Transmite en alta calidad con latencia ultra baja. Compatible con OBS y herramientas profesionales.' },
              { icon: Users, title: 'Comunidades', desc: 'Construye tu comunidad con seguidores, moderadores y herramientas de gestión.' },
              { icon: MessageCircle, title: 'Chat en tiempo real', desc: 'Interactúa con tu audiencia en tiempo real con emotes, moderación y más.' },
              { icon: TrendingUp, title: 'Descubrimiento', desc: 'Algoritmos inteligentes que ayudan a nuevos creadores a ser descubiertos.' },
              { icon: Shield, title: 'Seguridad', desc: 'Protección avanzada contra raids, toxicidad y comportamientos abusivos.' },
              { icon: Zap, title: 'Rendimiento', desc: 'Infraestructura global que garantiza streams estables y sin interrupciones.' },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-purple-500/30 transition-all group"
              >
                <div className="w-12 h-12 bg-purple-600/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-600/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free for everyone */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent via-purple-600/5 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 mb-6">
            <Star className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400">Gratis para siempre</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            100% gratuito para usuarios y creadores
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            NEXURA es y será siempre gratuito. Sin suscripciones obligatorias, sin anuncios invasivos, 
            sin límites artificiales. Creemos que la creatividad no debería tener barreras económicas.
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <Monitor className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <h3 className="font-semibold text-white mb-1">Sin costos ocultos</h3>
              <p className="text-sm text-gray-500">Transmite sin pagar nada</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <Globe className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <h3 className="font-semibold text-white mb-1">Sin límites</h3>
              <p className="text-sm text-gray-500">Horas ilimitadas de streaming</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <Users className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <h3 className="font-semibold text-white mb-1">Sin anuncios</h3>
              <p className="text-sm text-gray-500">Experiencia limpia para todos</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-purple-600/10 to-purple-400/10 border border-purple-600/20 rounded-2xl p-12">
          <h2 className="text-3xl font-bold text-white mb-4">¿Listo para comenzar?</h2>
          <p className="text-gray-400 mb-8">
            Crea tu cuenta en segundos y empieza a transmitir.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-8 py-3.5 rounded-xl text-lg font-medium transition-all hover:scale-105"
          >
            Crear cuenta gratis <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/brand/nexura-icon.svg" alt="NEXURA" className="w-6 h-6" />
            <span className="font-semibold text-white">NEXURA</span>
          </div>
          <p className="text-sm text-gray-500">© 2024 NEXURA. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Inicio</h1>
        <p className="text-gray-400">Descubre streams y creadores</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
        <Radio className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">No hay streams en vivo</h2>
        <p className="text-gray-400">
          Los streams en vivo aparecerán aquí cuando los creadores transmitan.
        </p>
      </div>
    </div>
  );
}
