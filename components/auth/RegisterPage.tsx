
import React, { useState } from 'react';
import { db } from '../../services/dbService';
import { hashPassword } from '../../utils/cryptoUtils';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    try {
      const existingUser = await db.getUser(email);
      if (existingUser) {
        setError('Este e-mail já está em uso.');
        return;
      }

      const passwordHash = await hashPassword(password);
      await db.addUser({
        email,
        passwordHash,
        role: 'user',
        status: 'PENDING',
      });

      setSuccess('Cadastro realizado com sucesso! Aguarde a aprovação de um administrador para fazer login.');
      setEmail('');
      setPassword('');
      setConfirmPassword('');

    } catch (err) {
      setError('Ocorreu um erro ao realizar o cadastro.');
      console.error(err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-rose-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl">
        <div className="text-center">
             <img src="https://img.icons8.com/nolan/64/love-letter.png" alt="logo" className="w-16 h-16 mx-auto"/>
            <h1 className="text-3xl font-bold text-pink-900 mt-2">Criar Conta</h1>
            <p className="text-slate-500">Junte-se ao editor de convites</p>
        </div>
        {success ? (
          <div className="p-4 text-green-800 bg-green-100 rounded-lg text-center">
            <p>{success}</p>
            <a href="#/login" className="font-bold text-green-900 hover:underline mt-2 inline-block">Voltar para o Login</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 mt-1 border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400" required />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-slate-600">Senha</label>
              <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 mt-1 border border-rose-200 rounded-lg" required />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-slate-600">Confirmar Senha</label>
              <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 mt-1 border border-rose-200 rounded-lg" required />
               <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 top-6 px-3 flex items-center text-slate-500">
                {showPassword ? <i data-lucide="eye-off" className="w-5 h-5"></i> : <i data-lucide="eye" className="w-5 h-5"></i>}
            </button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <button type="submit" className="w-full px-4 py-2 font-semibold text-white bg-pink-500 rounded-lg hover:bg-pink-600">
                Cadastrar
              </button>
            </div>
          </form>
        )}
        <div className="text-center text-sm text-slate-500">
          <p>Já tem uma conta? <a href="#/login" className="font-medium text-pink-600 hover:underline">Faça login</a></p>
        </div>
      </div>
    </div>
  );
}