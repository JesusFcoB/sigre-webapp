import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { PackageSearch, UserPlus, LogIn } from 'lucide-react';

const LoginView = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  
  // Registration form state
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState('profesor');

  const users = useStore((state) => state.users);
  const addUser = useStore((state) => state.addUser);
  const login = useStore((state) => state.login);

  const handleLogin = () => {
    if (!selectedUserId) return;
    const userToLogin = users.find(u => u.id === selectedUserId);
    if (userToLogin) {
      login(userToLogin);
    }
  };

  const handleRegister = () => {
    if (!newName.trim() || !newUsername.trim()) return;
    
    const newUser = {
      name: newName,
      username: newUsername,
      role: newRole,
    };
    
    addUser(newUser);
    setIsRegistering(false);
    setNewName('');
    setNewUsername('');
    setNewRole('profesor');
    // Automatically select the newly created user is a bit tricky here since id is generated in store, 
    // but the user will see it in the list now.
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-muted/40">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary p-3 rounded-full mb-4 shadow-sm">
            <PackageSearch className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">SIGRE</h1>
          <p className="text-muted-foreground mt-1 text-center font-medium">Gestión de Recursos Escolares</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle>{isRegistering ? 'Crear Nuevo Usuario' : 'Iniciar Sesión'}</CardTitle>
            <CardDescription>
              {isRegistering 
                ? 'Ingresa los datos del nuevo usuario local' 
                : 'Selecciona un usuario de la lista simulada'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isRegistering ? (
              <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Nombre Completo</label>
                  <Input 
                    placeholder="Ej. Juan Pérez" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Usuario / Correo</label>
                  <Input 
                    placeholder="Ej. jperez" 
                    value={newUsername} 
                    onChange={(e) => setNewUsername(e.target.value)} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Rol de Usuario</label>
                  <Select onChange={(e) => setNewRole(e.target.value)} value={newRole}>
                    <option value="director">Director / Administrador</option>
                    <option value="profesor">Profesor</option>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Usuario Activo</label>
                  <Select onChange={(e) => setSelectedUserId(e.target.value)} value={selectedUserId}>
                    <option value="" disabled>Selecciona un usuario...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role === 'director' ? 'Administrador' : 'Profesor'})
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            {isRegistering ? (
              <>
                <Button className="w-full" size="lg" onClick={handleRegister} disabled={!newName || !newUsername}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Registrar y Volver
                </Button>
                <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setIsRegistering(false)}>
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <Button className="w-full" size="lg" onClick={handleLogin} disabled={!selectedUserId}>
                  <LogIn className="w-4 h-4 mr-2" />
                  Entrar al Sistema
                </Button>
                <Button variant="outline" className="w-full text-muted-foreground border-dashed" onClick={() => setIsRegistering(true)}>
                  Crear nuevo usuario
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default LoginView;
