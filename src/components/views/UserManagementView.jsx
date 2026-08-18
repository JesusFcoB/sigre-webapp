import React, { useState, useEffect } from 'react';
import HelpTooltip from '@/components/ui/HelpTooltip';
import { useStore } from '../../store/useStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Users, ShieldAlert, CheckCircle2, Trash2, Edit2, KeyRound, X, Save, Hash, Calendar, User2 } from 'lucide-react';
import { createUser, getUsersList, deleteUserAccount, updateUserRole, forceUserPasswordReset, updateUserMetadata } from '@/lib/auth';

const UserManagementView = () => {
  const currentUser = useStore((state) => state.user);

  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('profesor');
  const [newMatricula, setNewMatricula] = useState('');
  const [newGenero, setNewGenero] = useState('');
  const [newAntiguedad, setNewAntiguedad] = useState('');

  const [isCreating, setIsCreating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Edit modal state
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', matricula: '', genero: '', antiguedad: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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
      await createUser(newUsername, newPassword, newRole, newName, {
        matricula: newMatricula,
        genero: newGenero,
        antiguedad: newAntiguedad,
      });
      setSuccessMsg(`Usuario ${newName || newUsername} creado exitosamente.`);
      setNewName('');
      setNewUsername('');
      setNewPassword('');
      setNewRole('profesor');
      setNewMatricula('');
      setNewGenero('');
      setNewAntiguedad('');
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

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      matricula: user.matricula || '',
      genero: user.genero || '',
      antiguedad: user.antiguedad || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setIsSavingEdit(true);
    try {
      await updateUserMetadata(editingUser.id, {
        name: editForm.name,
        matricula: editForm.matricula,
        genero: editForm.genero,
        antiguedad: editForm.antiguedad,
      });
      setEditingUser(null);
      await fetchUsers();
    } catch (error) {
      alert(error.message || 'Error al actualizar datos del usuario');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const getRoleBadge = (role) => {
    const styles = {
      director: 'bg-primary/15 text-primary border-primary/20',
      capturista: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
      profesor: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
    };
    const labels = { director: 'Director', capturista: 'Capturista', profesor: 'Profesor' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${styles[role] || styles.profesor}`}>
        {labels[role] || role}
      </span>
    );
  };

  const getGeneroLabel = (g) => {
    if (!g) return '';
    const map = { M: 'Masculino', F: 'Femenino', O: 'Otro' };
    return map[g] || g;
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
          Administra los accesos y expediente del personal escolar.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Alta */}
        <Card className="lg:col-span-1 border-primary/20 shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Nuevo Usuario</CardTitle>
            <CardDescription>Crea credenciales y expediente institucional.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nombre Completo *</label>
              <Input 
                placeholder="Ej. Ana María Gómez López" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Usuario / Correo *</label>
              <Input 
                placeholder="Ej. agomez@escuela.edu.mx" 
                value={newUsername} 
                onChange={(e) => setNewUsername(e.target.value)} 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Contraseña *</label>
              <Input 
                type="password"
                placeholder="Mín. 6 caracteres" 
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

            {/* Separator */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-dashed" /></div>
              <div className="relative flex justify-center"><span className="bg-card px-2 text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Datos Institucionales</span></div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                Matrícula / No. Empleado
              </label>
              <Input 
                placeholder="Ej. MAT-2024-0158" 
                value={newMatricula} 
                onChange={(e) => setNewMatricula(e.target.value)} 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <User2 className="w-3.5 h-3.5 text-muted-foreground" />
                Sexo / Género
              </label>
              <Select onChange={(e) => setNewGenero(e.target.value)} value={newGenero}>
                <option value="">— Sin especificar —</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="O">Otro</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                Antigüedad / Fecha de Ingreso
              </label>
              <Input 
                type="date"
                value={newAntiguedad} 
                onChange={(e) => setNewAntiguedad(e.target.value)} 
              />
            </div>

            {successMsg && (
              <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm flex gap-2 items-center border border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                <CheckCircle2 className="w-4 h-4" />
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex gap-2 items-center border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
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
              Directorio de Personal
              <Button variant="outline" size="sm" onClick={fetchUsers} disabled={isLoadingUsers}>
                {isLoadingUsers ? <Loader2 className="w-4 h-4 animate-spin" /> : "Actualizar"}
              </Button>
            </CardTitle>
            <CardDescription>
              Expediente y acceso de cada miembro del personal escolar.
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
              <div className="flex flex-col gap-3">
                {users.map(u => (
                  <div key={u.id} className="bg-muted/20 border rounded-2xl p-4 flex flex-col gap-3 hover:border-primary/30 transition-colors">
                    {/* Header: nombre, badge, acciones */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm text-foreground truncate">{u.name || 'Sin Nombre'}</p>
                          {getRoleBadge(u.role)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => openEditModal(u)}
                          title="Editar Expediente"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => handleResetPassword(u.id, u.email)}
                          title="Restablecer Contraseña"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:bg-destructive/10 h-8 w-8"
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          title="Eliminar Usuario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Datos institucionales */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      {u.matricula && (
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          <span className="font-medium text-foreground">{u.matricula}</span>
                        </span>
                      )}
                      {u.genero && (
                        <span className="flex items-center gap-1">
                          <User2 className="w-3 h-3" />
                          {getGeneroLabel(u.genero)}
                        </span>
                      )}
                      {u.antiguedad && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Ingreso: {u.antiguedad}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        📅 Registro: {new Date(u.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Role Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium">Rol:</span>
                      <Select 
                        value={u.role || 'profesor'} 
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="h-8 text-xs font-medium w-[140px]"
                      >
                        <option value="director">Director</option>
                        <option value="capturista">Capturista</option>
                        <option value="profesor">Profesor</option>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setEditingUser(null)}>
          <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-lg font-bold">Editar Expediente</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{editingUser.email}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingUser(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nombre Completo</label>
                <Input 
                  value={editForm.name} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} 
                  placeholder="Nombre completo"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                  Matrícula / No. Empleado
                </label>
                <Input 
                  value={editForm.matricula} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, matricula: e.target.value }))} 
                  placeholder="Ej. MAT-2024-0158"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <User2 className="w-3.5 h-3.5 text-muted-foreground" />
                  Sexo / Género
                </label>
                <Select 
                  value={editForm.genero} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, genero: e.target.value }))}
                >
                  <option value="">— Sin especificar —</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="O">Otro</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  Antigüedad / Fecha de Ingreso
                </label>
                <Input 
                  type="date"
                  value={editForm.antiguedad} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, antiguedad: e.target.value }))} 
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setEditingUser(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleSaveEdit} disabled={isSavingEdit}>
                {isSavingEdit ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Guardar Cambios</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementView;
