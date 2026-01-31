
import React, { useContext } from 'react';
import { ProjectContext } from '../App';
import { exportToZip } from '../services/exportService';
import { AuthContext } from '../contexts/AuthContext';

export default function Header() {
  const projectContext = useContext(ProjectContext);
  const authContext = useContext(AuthContext);

  if (!projectContext || !authContext) return null;
  const { project, updateProject } = projectContext;
  const { currentUser, logout } = authContext;

  const handleSaveProject = () => {
    const projectData = JSON.stringify(project, null, 2);
    const blob = new Blob([projectData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'convite-interativo.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const loadedProject = JSON.parse(e.target?.result as string);
          updateProject(loadedProject);
        } catch (error) {
          console.error("Error parsing project file:", error);
          alert("Arquivo de projeto inválido.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExport = async () => {
    try {
        await exportToZip(project);
    } catch (error) {
        console.error("Failed to export project:", error);
        alert(`Erro ao exportar o projeto: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <header className="flex items-center justify-between p-3 bg-white border-b border-rose-200 shadow-sm">
      <div className="flex items-center gap-3">
        <img src="https://img.icons8.com/nolan/64/love-letter.png" alt="logo" className="w-8 h-8"/>
        <h1 className="text-xl font-bold text-pink-900">Editor de Convites Interativos</h1>
      </div>
      <div className="flex items-center gap-2">
        {currentUser?.role === 'admin' && (
            <a href="#/admin" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors shadow-sm">
                <i data-lucide="shield" className="w-4 h-4"></i> Admin
            </a>
        )}
        <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-pink-500 rounded-lg hover:bg-pink-600 cursor-pointer transition-colors shadow-sm">
          <i data-lucide="upload" className="w-4 h-4"></i> Carregar
          <input type="file" accept=".json" className="hidden" onChange={handleLoadProject} />
        </label>
        <button onClick={handleSaveProject} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-pink-500 rounded-lg hover:bg-pink-600 transition-colors shadow-sm">
          <i data-lucide="save" className="w-4 h-4"></i> Salvar
        </button>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-pink-500 rounded-lg hover:bg-pink-600 transition-colors shadow-sm">
            <i data-lucide="file-archive" className="w-4 h-4"></i> Exportar
        </button>
        <button onClick={logout} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-pink-700 bg-pink-100 rounded-lg hover:bg-pink-200 transition-colors shadow-sm">
            <i data-lucide="log-out" className="w-4 h-4"></i> Sair
        </button>
      </div>
    </header>
  );
}