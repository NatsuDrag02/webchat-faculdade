import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Room } from '../lib/supabase';
import { Plus, Lock, Unlock, LogOut } from 'lucide-react';

interface RoomSelectionProps {
  userId: string;
  onSelectRoom: (room: Room) => void;
  onSignOut: () => void;
  displayName?: string;
}

export default function RoomSelection({ userId, onSelectRoom, onSignOut, displayName }: RoomSelectionProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [joiningRoom, setJoiningRoom] = useState<Room | null>(null);
  const [roomPassword, setRoomPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadRooms();
    const subscription = supabase
      .channel('rooms-changes')
      .on('postgres_changes', { event: '*', table: 'rooms', schema: 'public' }, () => {
        loadRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const loadRooms = async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRooms(data);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    setError('');
    const { error: insertError } = await supabase.from('rooms').insert({
      name: newRoomName.trim(),
      is_private: isPrivate,
      password: isPrivate ? password : null,
      created_by: userId,
    });

    if (insertError) {
      setError('Erro ao criar sala. Tente novamente.');
    } else {
      setNewRoomName('');
      setIsPrivate(false);
      setPassword('');
      setIsCreating(false);
      loadRooms();
    }
  };

  const handleJoinRoom = (room: Room) => {
    if (room.is_private) {
      setJoiningRoom(room);
      setRoomPassword('');
      setError('');
    } else {
      onSelectRoom(room);
    }
  };

  const verifyPassword = () => {
    if (!joiningRoom) return;
    if (roomPassword === joiningRoom.password) {
      onSelectRoom(joiningRoom);
    } else {
      setError('Senha incorreta.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <header className="bg-white shadow-md p-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">WebChat - Salas</h1>
          <p className="text-sm text-gray-600">Olá, {displayName || 'Usuário'}</p>
        </div>
        <button
          onClick={onSignOut}
          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          Sair
        </button>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-semibold text-gray-700">Escolha uma sala para conversar</h2>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg"
          >
            <Plus size={20} />
            Criar Sala
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => handleJoinRoom(room)}
              className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all border border-transparent hover:border-blue-400 text-left group"
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`p-2 rounded-lg ${room.is_private ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                  {room.is_private ? <Lock size={20} /> : <Unlock size={20} />}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                {room.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {room.is_private ? 'Sala Privada' : 'Sala Pública'}
              </p>
            </button>
          ))}
          {rooms.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              Nenhuma sala encontrada. Crie a primeira sala!
            </div>
          )}
        </div>
      </main>

      {/* Modal Criar Sala */}
      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Criar Nova Sala</h3>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Sala</label>
                <input
                  type="text"
                  required
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Estudo de React"
                />
              </div>
              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 text-blue-600"
                />
                <label htmlFor="isPrivate" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Sala Privada (com senha)
                </label>
              </div>
              {isPrivate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Digite a senha da sala"
                  />
                </div>
              )}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Senha */}
      {joiningRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-2">Entrar na Sala: {joiningRoom.name}</h3>
            <p className="text-sm text-gray-600 mb-4">Esta sala é privada. Digite a senha para entrar.</p>
            <div className="space-y-4">
              <input
                type="password"
                autoFocus
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Senha da sala"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setJoiningRoom(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={verifyPassword}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Entrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
