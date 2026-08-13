import React, { useState, useEffect } from 'react';
import HelpTooltip from '@/components/ui/HelpTooltip';
import { useStore } from '../../store/useStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Users, ShieldAlert, CheckCircle2, Trash2, Edit2, KeyRound } from 'lucide-react';
import { createUser, getUsersList, deleteUserAccount, updateUserRole, forceUserPasswordReset } from '@/lib/auth';

const UserManagementView = () => {
  const currentUser = useStore((state) => state.user);

  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('profesor');

  const [isCreating, setIsCreating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    setErrorMsg('');
    try {
      const data = await getUsersList();
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setErrorMsg('Error al cargar usuarios: ' + (error.message || 'Desconocido'));
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRegister = async () => {
    if (!newUsername.trim() || !newPassword.trim()) return;
    
    setIsCreating(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await createUser(newUsername, newPassword, newRole, newName);
      setSuccessMsg(`Usuario ${newName || newUsername} creado exitosamente.`);
      setNewName('');
      setNewUsername('');
      setNewPassword('');
      setNewRole('profesor');
      await fetchUsers(); // Refresh list
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error al crear usuario.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async (id, email) => {
    if (!window.confirm(`¿Estás seguro de eliminar permanentemente al usuario ${email}?`)) return;
    try {
      await deleteUserAccount(id);
      await fetchUsers();
    } catch (error) {
      alert(error.message || 'Error al eliminar usuario');
    }
  };

  const handleRoleChange = async (id, newRole) => {
    try {
      await updateUserRole(id, newRole);
      await fetchUsers();
    } catch (error) {
      alert(error.message || 'Error al actualizar rol');
    }
  };

  const handleResetPassword = async (id, email) => {
    const newPassword = window.prompt(`Ingresa la nueva contraseña para el usuario ${email}:`);
    if (!newPassword) return; // User cancelled or entered empty
    
    if (newPassword.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      await forceUserPasswordReset(id, newPassword);
      alert(`Contraseña actualizada exitosamente para ${email}`);
    } catch (error) {
      alert(error.message || 'Error al actualizar la contraseña');
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Gestión de Usuarios
          <HelpTooltip 
            title="Gestión de Cuentas y Accesos" 
            text="Administra las cuentas de acceso al sistema (Directores, Capturistas y Profesores). Permite crear nuevos usuarios, restablecer contraseñas y definir permisos." 
          />
        </h1>
        <p className="text-muted-foreground text-sm">
          Administra los accesos al sistema SIGRE.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Alta */}
        <Card className="lg:col-span-1 border-primary/20 shadow-sm h-fit">
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

        {/* Directorio de Usuarios */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex justify-between items-center">
              Directorio de Usuarios
              <Button variant="outline" size="sm" onClick={fetchUsers} disabled={isLoadingUsers}>
                {isLoadingUsers ? <Loader2 className="w-4 h-4 animate-spin" /> : "Actualizar"}
              </Button>
            </CardTitle>
            <CardDescription>
              Lista completa de usuarios registrados en el sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingUsers ? (
              <div className="flex justify-center py-8 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No se encontraron usuarios.</p>
                <p className="text-xs mt-1">Si acabas de crear funciones SQL, asegúrate de que se ejecutaron sin errores.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Usuario</th>
                      <th className="px-4 py-3">Rol</th>
                      <th className="px-4 py-3">Creado</th>
                      <th className="px-4 py-3 rounded-tr-lg text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{u.name || 'Sin Nombre'}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Select 
                            value={u.role || 'profesor'} 
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="h-8 text-xs font-medium w-[120px]"
                          >
                            <option value="director">Director</option>
                            <option value="capturista">Capturista</option>
                            <option value="profesor">Profesor</option>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-primary hover:bg-primary/10 h-8 w-8"
                              onClick={() => handleResetPassword(u.id, u.email)}
                              title="Forzar Cambio de Contraseña"
                            >
                              <KeyRound className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:bg-destructive/10 h-8 w-8"
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              title="Eliminar Usuario"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserManagementView;
