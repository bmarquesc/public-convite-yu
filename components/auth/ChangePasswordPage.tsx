
import React, { useState, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { db } from '../../services/dbService';
import { hashPassword } from '../../utils/cryptoUtils';

export default function ChangePasswordPage() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const authContext = useContext(AuthContext);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }
        if (newPassword.length < 6) {
            setError('A nova senha deve ter pelo menos 6 caracteres.');
            return;
        }
        if (!authContext?.currentUser) {
            setError('Nenhum usuário logado.');
            return;
        }

        try {
            const passwordHash = await hashPassword(newPassword);
            const updatedUser = {
                ...authContext.currentUser,
                passwordHash,
                mustChangePassword: false,
            };
            await db.updateUser(updatedUser);
            authContext.updateUserInSession(updatedUser);
            setSuccess('Senha alterada com sucesso! Você já pode usar o editor.');
            // A lógica no App.tsx irá redirecionar automaticamente.
        } catch (err) {
            setError('Ocorreu um erro ao alterar a senha.');
            console.error(err);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-rose-50">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-pink-900">Alterar Senha</h1>
                    <p className="text-slate-500">Por segurança, crie uma nova senha.</p>
                </div>
                {success ? (
                    <div className="p-4 text-green-800 bg-green-100 rounded-lg text-center">
                        <p>{success}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600">Nova Senha</label>
                            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-3 py-2 mt-1 border border-rose-200 rounded-lg" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600">Confirmar Nova Senha</label>
                            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 mt-1 border border-rose-200 rounded-lg" required />
                        </div>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <div>
                            <button type="submit" className="w-full px-4 py-2 font-semibold text-white bg-pink-500 rounded-lg hover:bg-pink-600">
                                Salvar Nova Senha
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}