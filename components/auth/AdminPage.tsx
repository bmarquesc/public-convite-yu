
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/dbService';
import { hashPassword, generateTempPassword } from '../../utils/cryptoUtils';

const statusStyles = {
    APPROVED: "bg-green-100 text-green-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    BLOCKED: "bg-red-100 text-red-800"
};

export default function AdminPage() {
    const [users, setUsers] = useState<any[]>([]);

    const fetchUsers = useCallback(async () => {
        const allUsers = await db.getAllUsers();
        setUsers(allUsers);
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleUpdateStatus = async (email: string, status: 'APPROVED' | 'BLOCKED') => {
        const user = await db.getUser(email);
        if (user) {
            await db.updateUser({ ...user, status });
            fetchUsers();
        }
    };
    
    const handleDeleteUser = async (email: string) => {
        if (confirm(`Tem certeza que deseja excluir o usuário ${email}? Esta ação não pode ser desfeita.`)) {
            await db.deleteUser(email);
            fetchUsers();
        }
    };
    
    const handleResetPassword = async (email: string) => {
        const tempPassword = generateTempPassword();
        if (confirm(`Gerar uma nova senha temporária para ${email}? A nova senha será exibida uma única vez.`)) {
            const user = await db.getUser(email);
            if (user) {
                const passwordHash = await hashPassword(tempPassword);
                await db.updateUser({ ...user, passwordHash, mustChangePassword: true });
                alert(`Senha temporária para ${email}:\n\n${tempPassword}\n\nCopie esta senha e a envie para o usuário. Ele(a) será solicitado(a) a trocá-la no próximo login.`);
                fetchUsers();
            }
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
             <div className="sm:flex sm:items-center mb-6">
                <div className="sm:flex-auto">
                    <div className="flex items-center gap-4">
                        <a href="#/editor" className="p-2 rounded-full hover:bg-slate-200 transition-colors">
                            <i data-lucide="arrow-left" className="w-6 h-6 text-slate-600"></i>
                        </a>
                        <div>
                            <h1 className="text-2xl font-semibold leading-6 text-pink-900">Painel de Administração</h1>
                            <p className="mt-2 text-sm text-slate-700">Gerencie os usuários que têm acesso ao editor de convites.</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                            <table className="min-w-full divide-y divide-rose-200">
                                <thead className="bg-rose-100">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-pink-900 sm:pl-6">E-mail</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-pink-900">Status</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-pink-900">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {users.map((user) => (
                                        <tr key={user.email}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{user.email} {user.role === 'admin' && <span className="text-xs font-bold text-blue-600">(Admin)</span>}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${statusStyles[user.status]}`}>
                                                    {user.status}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 space-x-2">
                                                {user.role !== 'admin' && (
                                                    <>
                                                        {user.status === 'PENDING' && <button onClick={() => handleUpdateStatus(user.email, 'APPROVED')} className="text-green-600 hover:text-green-900" title="Aprovar"><i data-lucide="check-circle" className="w-4 h-4"></i></button>}
                                                        {user.status === 'APPROVED' && <button onClick={() => handleUpdateStatus(user.email, 'BLOCKED')} className="text-red-600 hover:text-red-900" title="Bloquear"><i data-lucide="x-circle" className="w-4 h-4"></i></button>}
                                                        {user.status === 'BLOCKED' && <button onClick={() => handleUpdateStatus(user.email, 'APPROVED')} className="text-green-600 hover:text-green-900" title="Desbloquear"><i data-lucide="check-circle" className="w-4 h-4"></i></button>}
                                                        <button onClick={() => handleResetPassword(user.email)} className="text-yellow-600 hover:text-yellow-900" title="Redefinir Senha"><i data-lucide="key-round" className="w-4 h-4"></i></button>
                                                        <button onClick={() => handleDeleteUser(user.email)} className="text-gray-500 hover:text-red-700" title="Excluir"><i data-lucide="trash-2" className="w-4 h-4"></i></button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}