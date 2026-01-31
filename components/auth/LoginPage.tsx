
import React, { useState, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { db } from '../../services/dbService';
import { hashPassword } from '../../utils/cryptoUtils';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const authContext = useContext(AuthContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    try {
      const user = await db.getUser(email);
      if (!user) {
        setError('E-mail ou senha inválidos.');
        return;
      }

      const passwordHash = await hashPassword(password);
      if (user.passwordHash !== passwordHash) {
        setError('E-mail ou senha inválidos.');
        return;
      }
      
      authContext?.login(user);

    } catch (err) {
      setError('Ocorreu um erro. Tente novamente.');
      console.error(err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-rose-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl">
        <div className="text-center">
            <img src="https://img.icons8.com/nolan/64/love-letter.png" alt="logo" className="w-16 h-16 mx-auto"/>
            <h1 className="text-3xl font-bold text-pink-900 mt-2">Bem-vindo(a)</h1>
            <p className="text-slate-500">Faça login para continuar</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600">E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 mt-1 border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400" required />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-slate-600">Senha</label>
            <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 mt-1 border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 top-6 px-3 flex items-center text-slate-500">
                {showPassword ? <i data-lucide="eye-off" className="w-5 h-5"></i> : <i data-lucide="eye" className="w-5 h-5"></i>}
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <button type="submit" className="w-full px-4 py-2 font-semibold text-white bg-pink-500 rounded-lg hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-colors">
              Entrar
            </button>
          </div>
        </form>
        <div className="text-center text-sm text-slate-500">
          <p>Não tem uma conta? <a href="#/register" className="font-medium text-pink-600 hover:underline">Cadastre-se</a></p>
          <p className="mt-2">Esqueceu a senha? <span className="text-slate-400 cursor-help" title="Entre em contato com o administrador para redefinir sua senha.">Solicite ao administrador</span></p>
        </div>
      </div>
    </div>
  );
}