import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          const msg = signUpError.message?.toLowerCase?.() || '';
          if (msg.includes('rate limit') || msg.includes('too many requests')) {
            setError('Limite de envio de email excedido. Tente novamente mais tarde ou desative confirmações de email no projeto (desenvolvimento).');
            return;
          }
          throw signUpError;
        }

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email,
              display_name: displayName || email.split('@')[0],
            });

          if (profileError) throw profileError;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">WebChat</h1>
          <p className="text-gray-600">Chat em tempo real</p>
        </div>

        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              isLogin
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              !isLogin
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Registrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome de exibição
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Seu nome"
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              'Processando...'
            ) : isLogin ? (
              <>
                <LogIn size={20} />
                Entrar
              </>
            ) : (
              <>
                <UserPlus size={20} />
                Criar conta
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
