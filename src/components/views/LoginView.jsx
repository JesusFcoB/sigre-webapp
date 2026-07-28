import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { PackageSearch, UserPlus, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { signIn } from '@/lib/auth';

const LoginView = () => {
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const users = useStore((state) => state.users);
  const login = useStore((state) => state.login);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginEmail || !loginPassword) return;
    
    setIsLoading(true);
    try {
      await signIn(loginEmail, loginPassword);
      // login state will be handled by App.jsx onAuthStateChange
    } catch (err) {
      console.error(err);
      if (err.message.includes('Invalid login credentials')) {
        setLoginError('Correo o contraseña incorrectos.');
      } else {
        setLoginError('Error de red o conexión. Verifica tu internet.');
      }
    } finally {
      setIsLoading(false);
    }
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
            <CardTitle>Iniciar Sesión</CardTitle>
            <CardDescription>
              Ingresa tus credenciales de acceso
            </CardDescription>
          </CardHeader>

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
                    <label className="text-sm font-medium">Correo Electrónico</label>
                    <Input 
                      type="email"
                      placeholder="Tu correo" 
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
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
                <Button type="submit" className="w-full" size="lg" disabled={!loginEmail || !loginPassword || isLoading}>
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Conectando...</>
                  ) : (
                    <><LogIn className="w-4 h-4 mr-2" /> Entrar al Sistema</>
                  )}
                </Button>
              </CardFooter>
            </form>
        </Card>
      </div>
    </div>
  );
};

export default LoginView;
