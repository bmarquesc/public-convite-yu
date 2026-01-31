
import React, { useState, useCallback, useEffect, useContext } from 'react';
import { Project, Hotspot, Page } from './types';
import { INITIAL_PROJECT } from './constants';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Preview from './components/Preview';
import PropertiesPanel from './components/PropertiesPanel';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import AdminPage from './components/auth/AdminPage';
import ChangePasswordPage from './components/auth/ChangePasswordPage';
import { db } from './services/dbService';

declare global {
  interface Window {
    lucide: {
      createIcons: () => void;
    };
  }
}

export const ProjectContext = React.createContext<{
  project: Project;
  updateProject: (project: Project) => void;
  updatePage: (pageId: string, page: Partial<Page>) => void;
  addPage: (name: string, template: 'internal' | 'blank') => Page;
  deletePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  reorderPage: (pageId: string, direction: 'up' | 'down') => void;
  addHotspot: (pageId: string, hotspot: Partial<Hotspot>) => void;
  updateHotspot: (pageId: string, hotspotId: string, hotspot: Partial<Hotspot>) => void;
  deleteHotspot: (pageId: string, hotspotId: string) => void;
  duplicateHotspot: (pageId: string, hotspotId: string) => void;
  selectedPageId: string;
  setSelectedPageId: (id: string) => void;
  selectedHotspotId: string | null;
  setSelectedHotspotId: (id: string | null) => void;
} | null>(null);

function EditorComponent() {
  const [project, setProject] = useState<Project>(INITIAL_PROJECT);
  const [selectedPageId, setSelectedPageId] = useState<string>('cover');
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);

  const updateProject = useCallback((newProject: Project) => {
    setProject(newProject);
  }, []);

  const updatePage = useCallback((pageId: string, pageUpdate: Partial<Page>) => {
    setProject(p => ({
      ...p,
      pages: p.pages.map(pg => pg.id === pageId ? { ...pg, ...pageUpdate } : pg)
    }));
  }, []);
  
  const addPage = useCallback((name: string, template: 'internal' | 'blank' = 'blank') => {
    const newPageId = `page_${Date.now()}`;
    let hotspots: Hotspot[] = [];
    if (template === 'internal') {
        hotspots.push({ id: `hotspot_${Date.now()}`, name: 'Voltar', rect: { x: 5, y: 5, width: 20, height: 8 }, action: { type: 'navigate', targetPageId: 'hub' } });
    }
    const newPage: Page = { id: newPageId, name, type: 'internal', background: { type: 'image', src: '' }, hotspots };
    setProject(p => ({ ...p, pages: [...p.pages, newPage] }));
    return newPage;
  }, []);

  const deletePage = useCallback((pageId: string) => {
    setProject(p => {
        if (p.pages.length <= 1) {
            alert("Não é possível excluir a última página do projeto.");
            return p;
        }
        if (!confirm("Tem certeza que deseja excluir esta página? Todos os botões que apontam para ela serão marcados como inválidos.")) return p;

        const newPages = p.pages.filter(pg => pg.id !== pageId);
        
        const cleanedPages = newPages.map(pg => ({
            ...pg,
            hotspots: pg.hotspots.map(h => {
                if (h.action.type === 'navigate' && h.action.targetPageId === pageId) {
                    return { ...h, action: { ...h.action, invalid: true } };
                }
                return h;
            })
        }));

        if (selectedPageId === pageId) {
            setSelectedPageId(cleanedPages[0]?.id || 'hub');
        }
        
        return { ...p, pages: cleanedPages };
    });
  }, [selectedPageId]);

  const duplicatePage = useCallback((pageId: string) => {
    setProject(p => {
      const pageToDuplicate = p.pages.find(pg => pg.id === pageId);
      if (!pageToDuplicate) return p;
      const newPageId = `page_${Date.now()}`;
      const newHotspots = pageToDuplicate.hotspots.map((h, index) => ({ ...h, id: `hotspot_${newPageId}_${index}` }));
      const newPage: Page = { ...pageToDuplicate, id: newPageId, name: `${pageToDuplicate.name} (Cópia)`, hotspots: newHotspots };
      const originalIndex = p.pages.findIndex(pg => pg.id === pageId);
      const newPages = [...p.pages];
      newPages.splice(originalIndex + 1, 0, newPage);
      return { ...p, pages: newPages };
    });
  }, []);

  const reorderPage = useCallback((pageId: string, direction: 'up' | 'down') => {
      setProject(p => {
          const pages = [...p.pages];
          const index = pages.findIndex(pg => pg.id === pageId);
          if (index === -1) return p;
          const newIndex = direction === 'up' ? index - 1 : index + 1;
          if (newIndex < 0 || newIndex >= pages.length) return p;
          const [movedPage] = pages.splice(index, 1);
          pages.splice(newIndex, 0, movedPage);
          return { ...p, pages };
      });
  }, []);

  const addHotspot = useCallback((pageId: string, hotspot: Partial<Hotspot>) => {
    const newHotspotId = `hotspot_${Date.now()}`;
    setProject(p => ({
      ...p,
      pages: p.pages.map(pg => {
        if (pg.id === pageId) {
          const newHotspot: Hotspot = { id: newHotspotId, name: 'Novo Botão', rect: { x: 40, y: 40, width: 20, height: 10 }, action: { type: 'externalLink', url: '', newTab: true }, ...hotspot };
          return { ...pg, hotspots: [...pg.hotspots, newHotspot] };
        }
        return pg;
      })
    }));
    setSelectedHotspotId(newHotspotId);
  }, []);

  const updateHotspot = useCallback((pageId: string, hotspotId: string, hotspotUpdate: Partial<Hotspot>) => {
    setProject(p => ({
      ...p,
      pages: p.pages.map(pg => pg.id === pageId ? { ...pg, hotspots: pg.hotspots.map(h => h.id === hotspotId ? { ...h, ...hotspotUpdate } : h) } : pg)
    }));
  }, []);

  const deleteHotspot = useCallback((pageId: string, hotspotId: string) => {
    setProject(p => ({
      ...p,
      pages: p.pages.map(pg => pg.id === pageId ? { ...pg, hotspots: pg.hotspots.filter(h => h.id !== hotspotId) } : pg)
    }));
    setSelectedHotspotId(null);
  }, []);

  const duplicateHotspot = useCallback((pageId: string, hotspotId: string) => {
    setProject(p => {
        const page = p.pages.find(pg => pg.id === pageId);
        const hotspotToDuplicate = page?.hotspots.find(h => h.id === hotspotId);
        if (!page || !hotspotToDuplicate) return p;
        const newHotspot: Hotspot = { ...hotspotToDuplicate, id: `hotspot_${Date.now()}`, rect: { ...hotspotToDuplicate.rect, y: hotspotToDuplicate.rect.y + 5 } };
        return { ...p, pages: p.pages.map(pg => pg.id === pageId ? { ...pg, hotspots: [...pg.hotspots, newHotspot] } : pg) };
    });
  }, []);

  const contextValue = { project, updateProject, updatePage, addPage, deletePage, duplicatePage, reorderPage, addHotspot, updateHotspot, deleteHotspot, duplicateHotspot, selectedPageId, setSelectedPageId, selectedHotspotId, setSelectedHotspotId };

  return (
    <ProjectContext.Provider value={contextValue}>
      <div className="flex flex-col h-screen bg-rose-50 font-sans">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 flex items-center justify-center p-4 bg-rose-200/30 overflow-hidden">
            <Preview />
          </main>
          <PropertiesPanel />
        </div>
      </div>
    </ProjectContext.Provider>
  );
}

function AppRouter() {
    const [route, setRoute] = useState(window.location.hash || '#/login');
    const { currentUser, logout } = useContext(AuthContext);

    useEffect(() => {
        const handleHashChange = () => setRoute(window.location.hash);
        window.addEventListener('hashchange', handleHashChange);
        db.initAdmin(); // Initialize admin user on app start
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    useEffect(() => {
        if (currentUser) {
            if (currentUser.mustChangePassword) {
                if (route !== '#/change-password') window.location.hash = '#/change-password';
            } else if (route === '#/login' || route === '#/register' || !route || route === '#/') {
                window.location.hash = '#/editor';
            }
        } else {
             if (route !== '#/register') {
                window.location.hash = '#/login';
            }
        }
    }, [currentUser, route]);

    useEffect(() => {
      // This effect runs after every render, ensuring that any new icons
      // added to the DOM are processed by Lucide.
      if (window.lucide) {
          window.lucide.createIcons();
      }
    }); // No dependency array to run on every render

    const renderRoute = () => {
        if (currentUser) {
            if (currentUser.mustChangePassword) return <ChangePasswordPage />;
            
            switch (currentUser.status) {
                case 'PENDING': return <div className="flex h-screen items-center justify-center text-center"><div className="p-8 bg-white rounded-lg shadow-xl"><h1>Aguardando aprovação</h1><p className="text-slate-600 mt-2">Sua conta precisa ser aprovada por um administrador.</p><button onClick={logout} className="mt-4 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600">Voltar</button></div></div>;
                case 'BLOCKED': return <div className="flex h-screen items-center justify-center text-center"><div className="p-8 bg-white rounded-lg shadow-xl"><h1>Conta Bloqueada</h1><p className="text-slate-600 mt-2">Sua conta foi bloqueada. Entre em contato com o administrador.</p><button onClick={logout} className="mt-4 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600">Voltar</button></div></div>;
                case 'APPROVED':
                    if (currentUser.role === 'admin' && route === "#/admin") return <AdminPage />;
                    if (route.startsWith('#/editor') || route === '') return <EditorComponent />;
                    // Fallback to editor for any other hash
                    return <EditorComponent />;
            }
        }
        
        if (route === '#/register') return <RegisterPage />;
        return <LoginPage />; // Default to login
    };

    return <div className="bg-rose-50 min-h-screen">{renderRoute()}</div>;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
