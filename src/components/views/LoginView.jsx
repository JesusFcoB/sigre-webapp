import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { PackageSearch, UserPlus, LogIn, AlertCircle } from 'lucide-react';

const LoginView = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Registration form state
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('capturista');

  const users = useStore((state) => state.users);
  const addUser = useStore((state) => state.addUser);
  const login = useStore((state) => state.login);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginUsername || !loginPassword) return;
    
    const userToLogin = users.find(u => u.username === loginUsername && u.password === loginPassword);
    if (userToLogin) {
      login(userToLogin);
    } else {
      setLoginError('Usuario o contraseña incorrectos.');
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) return;
    
    // Check if username exists
    if (users.find(u => u.username === newUsername)) {
      alert("El nombre de usuario ya existe.");
      return;
    }

    const newUser = {
      name: newName,
      username: newUsername,
      password: newPassword,
      role: newRole,
    };
    
    addUser(newUser);
    setIsRegistering(false);
    setNewName('');
    setNewUsername('');
    setNewPassword('');
    setNewRole('capturista');
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
                : 'Ingresa tus credenciales de acceso'}
            </CardDescription>
          </CardHeader>

          {isRegistering ? (
            <form onSubmit={handleRegister}>
              <CardContent className="space-y-4">
                <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Nombre Completo</label>
                    <Input 
                      placeholder="Ej. Juan Pérez" 
                      value={newName} 
                      onChange={(e) => setNewName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Usuario / Correo</label>
                    <Input 
                      placeholder="Ej. jperez" 
                      value={newUsername} 
                      onChange={(e) => setNewUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Contraseña</label>
                    <Input 
                      type="password"
                      placeholder="Contraseña segura" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Rol de Usuario</label>
                    <Select onChange={(e) => setNewRole(e.target.value)} value={newRole}>
                      <option value="director">Director / Administrador</option>
                      <option value="capturista">Capturista</option>
                      <option value="profesor">Profesor</option>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" size="lg" disabled={!newName || !newUsername || !newPassword}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Registrar y Volver
                </Button>
                <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={() => setIsRegistering(false)}>
                  Cancelar
                </Button>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                  {loginError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex gap-2 items-center border border-red-100">
                      <AlertCircle className="w-4 h-4" />
                      {loginError}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Usuario</label>
                    <Input 
                      placeholder="Tu nombre de usuario" 
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Contraseña</label>
                    <Input 
                      type="password"
                      placeholder="Tu contraseña" 
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" size="lg" disabled={!loginUsername || !loginPassword}>
                  <LogIn className="w-4 h-4 mr-2" />
                  Entrar al Sistema
                </Button>
                <Button type="button" variant="outline" className="w-full text-muted-foreground border-dashed" onClick={() => setIsRegistering(true)}>
                  Crear nuevo usuario
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default LoginView;
