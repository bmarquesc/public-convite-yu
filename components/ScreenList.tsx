
import React, { useContext } from 'react';
import { ProjectContext } from '../App';
import { Page, Hotspot, Action } from '../types';

const pageIcons = {
    cover: <i data-lucide="file-text" className="w-4 h-4 text-blue-400"></i>,
    video: <i data-lucide="file-video" className="w-4 h-4 text-purple-400"></i>,
    hub: <i data-lucide="layout-grid" className="w-4 h-4 text-green-400"></i>,
    internal: <i data-lucide="file-text" className="w-4 h-4 text-gray-400"></i>,
};

export default function ScreenList() {
    const context = useContext(ProjectContext);
    if (!context) return null;

    const { project, selectedPageId, setSelectedPageId, addHotspot, addPage, deletePage, updatePage, duplicatePage, reorderPage } = context;

    const handleCreateInternalPage = () => {
        const pageName = prompt("Nome da nova página interna (ex: Traje):");
        if (pageName && pageName.trim()) {
            const newPage = addPage(pageName.trim(), 'internal');
            const hotspotAction: Action = { type: 'navigate', targetPageId: newPage.id };
            addHotspot('hub', { name: pageName, action: hotspotAction });
            setSelectedPageId(newPage.id);
        }
    };
    
    const handleAddPreset = (type: 'link' | 'rsvp' | 'map' | 'page') => {
        if(type === 'page') {
            handleCreateInternalPage();
            return;
        }

        let preset: Partial<Hotspot> = {};
        switch (type) {
            case 'link':
                preset = { name: 'Link Externo', action: { type: 'externalLink', url: 'https://', newTab: true } };
                break;
            case 'rsvp':
                preset = { name: 'Confirmar Presença', action: { type: 'rsvp' } };
                break;
            case 'map':
                preset = { name: 'Local da Festa', action: { type: 'map' } };
                break;
        }
        addHotspot(selectedPageId, preset);
    };
    
    const handleAddNewPage = () => {
        const pageName = prompt("Nome da nova página:");
        if (pageName && pageName.trim()) {
            const newPage = addPage(pageName.trim(), 'blank');
            setSelectedPageId(newPage.id);
        }
    };
    
    const handleRenamePage = (pageId: string, currentName: string) => {
        const newName = prompt("Novo nome da página:", currentName);
        if (newName && newName.trim()) {
            updatePage(pageId, { name: newName.trim() });
        }
    };


    return (
        <div className="p-4 space-y-4">
            <div>
                <h3 className="text-xs font-bold uppercase text-pink-900/60 mb-2 flex justify-between items-center">
                    <span>Páginas do Convite</span>
                    <button onClick={handleAddNewPage} className="p-1 text-pink-600 hover:text-pink-800" title="Adicionar nova página em branco">
                        <i data-lucide="plus" className="w-4 h-4"></i>
                    </button>
                </h3>
                <ul className="space-y-1">
                    {project.pages.map((page, index) => (
                        <li key={page.id} className={`flex items-center group ${selectedPageId === page.id ? 'bg-pink-100' : ''} rounded-lg`}>
                            <button
                                onClick={() => setSelectedPageId(page.id)}
                                className={`flex items-center gap-2 w-full text-left p-2 rounded-lg transition-colors ${
                                    selectedPageId === page.id ? 'text-pink-800 font-semibold' : 'hover:bg-rose-100/50 text-slate-600'
                                }`}
                            >
                                {pageIcons[page.type]}
                                <span className="flex-1 truncate text-sm">{page.name}</span>
                            </button>
                            <div className="flex items-center pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => reorderPage(page.id, 'up')} disabled={index === 0} className="p-1 text-slate-500 hover:text-pink-600 disabled:opacity-20" title="Mover para cima"><i data-lucide="arrow-up" className="w-3.5 h-3.5"></i></button>
                                <button onClick={() => reorderPage(page.id, 'down')} disabled={index === project.pages.length - 1} className="p-1 text-slate-500 hover:text-pink-600 disabled:opacity-20" title="Mover para baixo"><i data-lucide="arrow-down" className="w-3.5 h-3.5"></i></button>
                                <button onClick={() => duplicatePage(page.id)} className="p-1 text-slate-500 hover:text-pink-600" title="Duplicar página"><i data-lucide="copy" className="w-3.5 h-3.5"></i></button>
                                <button onClick={() => handleRenamePage(page.id, page.name)} className="p-1 text-slate-500 hover:text-pink-600" title="Renomear página"><i data-lucide="edit" className="w-3.5 h-3.5"></i></button>
                                {page.type !== 'cover' && page.type !== 'hub' && page.type !== 'video' && (
                                    <button onClick={() => deletePage(page.id)} className="p-1 text-slate-500 hover:text-red-600" title="Excluir página">
                                        <i data-lucide="trash-2" className="w-3.5 h-3.5"></i>
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            
            <div>
                <h3 className="text-xs font-bold uppercase text-pink-900/60 mb-2">Adicionar Botão (Preset)</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <button onClick={() => handleAddPreset('link')} className="flex items-center gap-2 p-2 bg-rose-100 rounded-lg hover:bg-rose-200 text-slate-700 transition-colors">
                        <i data-lucide="link" className="w-4 h-4"></i> Abrir Link
                    </button>
                    <button onClick={() => handleAddPreset('page')} className="flex items-center gap-2 p-2 bg-rose-100 rounded-lg hover:bg-rose-200 text-slate-700 transition-colors">
                        <i data-lucide="file-plus-2" className="w-4 h-4"></i> Página Interna
                    </button>
                    <button onClick={() => handleAddPreset('rsvp')} className="flex items-center gap-2 p-2 bg-rose-100 rounded-lg hover:bg-rose-200 text-slate-700 transition-colors">
                        <i data-lucide="check-square" className="w-4 h-4"></i> Confirmar
                    </button>
                    <button onClick={() => handleAddPreset('map')} className="flex items-center gap-2 p-2 bg-rose-100 rounded-lg hover:bg-rose-200 text-slate-700 transition-colors">
                        <i data-lucide="map-pin" className="w-4 h-4"></i> Mapa
                    </button>
                </div>
            </div>
        </div>
    );
}