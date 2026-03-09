import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { Send, LogOut } from 'lucide-react';
import type { Message, Profile } from '../lib/supabase';

interface ChatProps {
  user: {
    id: string;
    email?: string;
  };
}

export default function Chat({ user }: ChatProps) {
  const [messages, setMessages] = useState<(Message & { profiles: Profile })[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [tick, setTick] = useState(0);
  const [subscribed, setSubscribed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initialize = async () => {
      await loadProfile();
      await loadMessages();
      setupRealtimeSubscription();
      setupCleanupInterval();
      setupPollingFallback();
    };

    initialize();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [user.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        setCurrentProfile(data);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const loadMessages = async () => {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          user_id,
          content,
          created_at,
          profiles:user_id (
            id,
            email,
            display_name,
            created_at
          )
        `)
        .gte('created_at', oneMinuteAgo)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      if (data) {
        type JoinedRow = {
          id: string;
          user_id: string;
          content: string;
          created_at: string;
          profiles: Profile | Profile[];
        };
        const normalized = (data as JoinedRow[]).map((msg) => {
          const p = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles;
          return {
            id: msg.id,
            user_id: msg.user_id,
            content: msg.content,
            created_at: msg.created_at,
            profiles: p,
          };
        }) as (Message & { profiles: Profile })[];
        setMessages(normalized);
      }
    } catch (err) {
      console.error('Error in loadMessages:', err);
    }
  };

  const setupCleanupInterval = () => {
    cleanupIntervalRef.current = setInterval(async () => {
      try {
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

        const { error } = await supabase
          .from('messages')
          .delete()
          .lt('created_at', oneMinuteAgo);

        if (error) {
          console.error('Error cleaning up messages:', error);
        } else {
          await loadMessages();
        }
      } catch (err) {
        console.error('Error in cleanup interval:', err);
      } finally {
        setTick((t) => t + 1);
      }
    }, 60000);
  };

  const setupRealtimeSubscription = () => {
    channelRef.current = supabase
      .channel('messages:all', {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload: RealtimePostgresChangesPayload<Message>) => {
          try {
            const newRow = payload.new as unknown as Message;
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newRow.user_id)
              .maybeSingle();

            if (profile) {
              setMessages((current) => [
                ...current,
                {
                  id: newRow.id,
                  user_id: newRow.user_id,
                  content: newRow.content,
                  created_at: newRow.created_at,
                  profiles: profile,
                } as Message & { profiles: Profile },
              ]);
            }
          } catch (err) {
            console.error('Error handling INSERT:', err);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          try {
            const oldRow = payload.old as unknown as Partial<Message>;
            setMessages((current) =>
              current.filter((msg) => msg.id !== oldRow.id)
            );
          } catch (err) {
            console.error('Error handling DELETE:', err);
          }
        }
      )
      .subscribe((status) => {
        setSubscribed(status === 'SUBSCRIBED');
      });
  };

  const setupPollingFallback = () => {
    pollIntervalRef.current = setInterval(async () => {
      if (!subscribed) {
        await loadMessages();
      }
    }, 500);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('messages').insert({
        content: newMessage.trim(),
        user_id: user.id,
      });

      if (error) {
        console.error('Error sending message:', error);
      } else {
        setNewMessage('');
        await loadMessages();
      }
    } catch (err) {
      console.error('Error in sendMessage:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const cutoffIso = new Date(Date.now() - 60 * 1000 + tick).toISOString();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <header className="bg-white shadow-md p-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">WebChat</h1>
          <p className="text-sm text-gray-600">
            Conectado como {currentProfile?.display_name || 'Usuário'}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          Sair
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.filter((m) => m.created_at >= cutoffIso).length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Nenhuma mensagem ainda. Comece a conversar!</p>
          </div>
        ) : (
          messages
            .filter((m) => m.created_at >= cutoffIso)
            .map((message) => {
            const isOwn = message.user_id === user.id;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs md:max-w-md lg:max-w-lg ${
                    isOwn
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-800'
                  } rounded-lg p-3 shadow-md`}
                >
                  {!isOwn && (
                    <p className="text-xs font-semibold mb-1 opacity-75">
                      {message.profiles?.display_name || 'Usuário'}
                    </p>
                  )}
                  <p className="break-words">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwn ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {formatTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={sendMessage}
        className="bg-white border-t border-gray-200 p-4"
      >
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !newMessage.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send size={20} />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </div>
      </form>
    </div>
  );
}
