import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Ping() {
  const [status, setStatus] = useState<'verificando' | 'ok' | 'erro'>('verificando');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      if (cancelled) return;
      if (error) {
        setStatus('erro');
        setMessage(error.message);
      } else {
        setStatus('ok');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const show = import.meta.env.VITE_SHOW_PING;
  if (show === 'false') return null;

  return (
    <div className="fixed bottom-3 right-3 z-50">
      {status === 'verificando' && (
        <div className="px-3 py-2 text-xs rounded bg-gray-800 text-white">Verificando conexão…</div>
      )}
      {status === 'ok' && (
        <div className="px-3 py-2 text-xs rounded bg-green-600 text-white">Supabase: conectado</div>
      )}
      {status === 'erro' && (
        <div className="px-3 py-2 text-xs rounded bg-red-600 text-white">
          Supabase: erro {message && `- ${message}`}
        </div>
      )}
    </div>
  );
}
