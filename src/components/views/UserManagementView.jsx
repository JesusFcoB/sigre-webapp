import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Users, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { createUser } from '@/lib/auth';

const UserManagementView = () => {
  const currentUser = useStore((state) => state.user);

  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('profesor');

  const [isCreating, setIsCreating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async () => {
    if (!newUsername.trim() || !newPassword.trim()) return;
    
    setIsCreating(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await createUser(newUsername, newPassword, newRole, newName);
      setSuccessMsg(`Usuario ${newName} creado exitosamente.`);
      setNewName('');
      setNewUsername('');
      setNewPassword('');
      setNewRole('profesor');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error al crear usuario.');
    } finally {
      setIsCreating(false);
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
              <label className="text-sm font-medium">Nombre Completo <span className="text-muted-foreground font-normal">(Opcional)</span></label>
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
            {successMsg && (
              <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm flex gap-2 items-center border border-green-100">
                <CheckCircle2 className="w-4 h-4" />
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex gap-2 items-center border border-red-100">
                <ShieldAlert className="w-4 h-4" />
                {errorMsg}
              </div>
            )}
            <Button className="w-full mt-2" onClick={handleRegister} disabled={!newUsername || !newPassword || isCreating}>
              {isCreating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creando en Supabase...</>
              ) : (
                <><UserPlus className="w-4 h-4 mr-2" /> Registrar Usuario</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Lista de Usuarios Removida Temporalmente */}
        <Card className="md:col-span-2 shadow-sm bg-muted/20">
          <CardHeader>
            <CardTitle className="text-lg text-muted-foreground">Directorio de Usuarios</CardTitle>
            <CardDescription>
              Para ver el directorio completo de todos los usuarios registrados, debes iniciar sesión en el panel de control de tu proyecto en Supabase (Sección Authentication). 
              Esta pantalla está optimizada únicamente para dar de alta accesos rápidamente.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};

export default UserManagementView;
