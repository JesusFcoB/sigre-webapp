import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trash2, Users, ShieldAlert } from 'lucide-react';

const UserManagementView = () => {
  const users = useStore((state) => state.users);
  const addUser = useStore((state) => state.addUser);
  const removeUser = useStore((state) => state.removeUser);
  const currentUser = useStore((state) => state.user);

  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('profesor');

  const handleRegister = () => {
    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) return;
    
    addUser({
      name: newName,
      username: newUsername,
      password: newPassword,
      role: newRole,
    });
    
    setNewName('');
    setNewUsername('');
    setNewPassword('');
    setNewRole('profesor');
  };

  const handleDelete = (id) => {
    if (id === currentUser.id) {
      alert("No puedes eliminar tu propio usuario mientras estás en sesión.");
      return;
    }
    if (window.confirm("¿Seguro que deseas eliminar este usuario?")) {
      removeUser(id);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Gestión de Usuarios
        </h1>
        <p className="text-muted-foreground text-sm">
          Administra los accesos al sistema SIGRE.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Formulario de Alta */}
        <Card className="md:col-span-1 border-primary/20 shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Nuevo Usuario</CardTitle>
            <CardDescription>Crea credenciales locales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nombre Completo</label>
              <Input 
                placeholder="Ej. Ana Gómez" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Usuario / Correo</label>
              <Input 
                placeholder="Ej. agomez" 
                value={newUsername} 
                onChange={(e) => setNewUsername(e.target.value)} 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Contraseña</label>
              <Input 
                type="password"
                placeholder="Contraseña segura" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rol</label>
              <Select onChange={(e) => setNewRole(e.target.value)} value={newRole}>
                <option value="director">Director / Administrador</option>
                <option value="capturista">Capturista</option>
                <option value="profesor">Profesor</option>
              </Select>
            </div>
            <Button className="w-full mt-2" onClick={handleRegister} disabled={!newName || !newUsername || !newPassword}>
              <UserPlus className="w-4 h-4 mr-2" />
              Registrar Usuario
            </Button>
          </CardContent>
        </Card>

        {/* Lista de Usuarios */}
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Usuarios Registrados ({users.length})</CardTitle>
            <CardDescription>Lista de cuentas con acceso al prototipo.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {users.map(u => (
                <div key={u.id} className="bg-card border rounded-xl p-4 flex gap-4 items-center justify-between transition-all hover:border-primary/30">
                  <div className="flex flex-col">
                    <p className="font-bold text-base flex items-center gap-2">
                      {u.name}
                      {u.id === currentUser.id && (
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                          Tú
                        </Badge>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{u.username}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={u.role === 'director' ? 'default' : u.role === 'capturista' ? 'outline' : 'secondary'} className="hidden sm:inline-flex">
                      {u.role === 'director' ? 'Administrador' : u.role === 'capturista' ? 'Capturista' : 'Profesor'}
                    </Badge>
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="h-8 w-8 bg-red-50 text-red-600 hover:bg-red-100"
                      onClick={() => handleDelete(u.id)}
                      disabled={u.id === currentUser.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserManagementView;
