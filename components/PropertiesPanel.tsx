
import React, { useContext } from 'react';
import { ProjectContext } from '../App';
import { Page, Hotspot, Action, Background } from '../types';
import { handleFileUpload } from '../utils/fileUtils';

export default function PropertiesPanel() {
    const context = useContext(ProjectContext);
    if (!context) return null;

    const { project, selectedPageId } = context;

    const selectedPage = project.pages.find(p => p.id === selectedPageId);
    const selectedHotspot = selectedPage?.hotspots.find(h => h.id === context.selectedHotspotId);

    if (!selectedPage) return <aside className="w-80 bg-white border-l border-rose-200"></aside>;

    return (
        <aside className="w-80 bg-white border-l border-rose-200 p-4 overflow-y-auto">
            <h3 className="text-lg font-semibold text-pink-900 mb-4">Propriedades</h3>
            
            {!selectedHotspot && <PageEditor page={selectedPage} />}
            {selectedHotspot && <HotspotEditor page={selectedPage} hotspot={selectedHotspot} />}
            
        </aside>
    );
}

interface PageEditorProps {
    page: Page;
}

function PageEditor({ page }: PageEditorProps) {
    const context = useContext(ProjectContext);
    if (!context) return null;
    const { updatePage } = context;

    const handleBackgroundChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const { src } = await handleFileUpload(file);
            const type = file.type.startsWith('video') ? 'video' : 'image';
            
            const newBackground: Background = {
                ...page.background, type, src, file,
                videoSettings: type === 'video' ? (page.background.videoSettings || { autoplay: true, loop: true, muted: true, controls: false }) : undefined,
            };
            updatePage(page.id, { background: newBackground });
        }
    };

    const handleVideoSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        if (page.background.type === 'video') {
            updatePage(page.id, {
                background: {
                    ...page.background,
                    videoSettings: { ...(page.background.videoSettings ?? { autoplay: true, loop: true, muted: true, controls: false }), [name]: checked, }
                }
            });
        }
    };

    return (
        <div className="space-y-4 text-sm">
            <div>
                <label className="block text-slate-600 font-medium mb-1">Nome da Tela</label>
                <input type="text" value={page.name} onChange={(e) => updatePage(page.id, { name: e.target.value })} className="w-full bg-white border border-rose-200 rounded-lg px-3 py-2" />
            </div>
            <div>
                <label className="block text-slate-600 font-medium mb-1">Fundo (Imagem ou Vídeo)</label>
                <input type="file" accept="image/*,video/mp4" onChange={handleBackgroundChange} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-pink-500 file:text-white hover:file:bg-pink-600"/>
            </div>
             {page.background.src && <span className="text-xs text-green-600 mt-1 block">Arquivo carregado.</span>}

             {page.background.type === 'video' && (
                <div className="p-3 bg-rose-100/50 rounded-lg space-y-2 text-slate-700">
                    <h4 className="font-semibold text-pink-800 mb-2">Opções do Vídeo</h4>
                    <label className="flex items-center gap-2"><input type="checkbox" name="autoplay" checked={page.background.videoSettings?.autoplay ?? true} onChange={handleVideoSettingsChange} className="rounded text-pink-600" /> Autoplay</label>
                    <label className="flex items-center gap-2"><input type="checkbox" name="loop" checked={page.background.videoSettings?.loop ?? true} onChange={handleVideoSettingsChange} className="rounded text-pink-600" /> Loop</label>
                    <label className="flex items-center gap-2"><input type="checkbox" name="muted" checked={page.background.videoSettings?.muted ?? true} onChange={handleVideoSettingsChange} className="rounded text-pink-600" /> Mudo (Recomendado)</label>
                    <label className="flex items-center gap-2"><input type="checkbox" name="controls" checked={page.background.videoSettings?.controls ?? false} onChange={handleVideoSettingsChange} className="rounded text-pink-600" /> Mostrar Controles</label>
                </div>
            )}
        </div>
    );
}

interface HotspotEditorProps { page: Page; hotspot: Hotspot; }

function HotspotEditor({ page, hotspot }: HotspotEditorProps) {
    const context = useContext(ProjectContext);
    if (!context) return null;
    const { project, updateHotspot, deleteHotspot, duplicateHotspot } = context;
    
    const isInvalid = hotspot.action.type === 'navigate' && hotspot.action.invalid;

    const handleHotspotChange = (updates: Partial<Hotspot>) => updateHotspot(page.id, hotspot.id, updates);
    const handleActionChange = (action: Action) => handleHotspotChange({ action });
    const handleNavActionChange = (targetPageId: string) => handleActionChange({ type: 'navigate', targetPageId, invalid: false });


    return (
        <div className="space-y-4 text-sm">
             {isInvalid && (
                <div className="p-3 mb-2 text-sm text-red-800 bg-red-100 rounded-lg flex items-start gap-3">
                    <i data-lucide="alert-triangle" className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"></i>
                    <div>
                        <h4 className="font-bold">Ação Inválida</h4>
                        <p>A página de destino deste botão foi excluída. Por favor, escolha uma nova página abaixo.</p>
                    </div>
                </div>
            )}
            <div>
                <label className="block text-slate-600 font-medium mb-1">Nome do Botão</label>
                <input type="text" value={hotspot.name} onChange={e => handleHotspotChange({ name: e.target.value })} className="w-full bg-white border border-rose-200 rounded-lg px-3 py-2"/>
            </div>
            
            <div>
                <label className="block text-slate-600 font-medium mb-1">Ação</label>
                 <select value={hotspot.action.type} disabled={['rsvp', 'map'].includes(hotspot.action.type)} onChange={e => {
                     const type = e.target.value as 'navigate' | 'externalLink';
                     if (type === 'navigate') handleActionChange({ type: 'navigate', targetPageId: 'hub' });
                     if (type === 'externalLink') handleActionChange({ type: 'externalLink', url: '', newTab: true });
                 }} className="w-full bg-white border border-rose-200 rounded-lg px-3 py-2 disabled:opacity-50">
                     <option value="navigate">Navegar para Página</option>
                     <option value="externalLink">Abrir Link Externo</option>
                     <option value="rsvp" disabled>Confirmar Presença</option>
                     <option value="map" disabled>Abrir Mapa</option>
                 </select>
            </div>

            {hotspot.action.type === 'navigate' && (
                <div>
                    <label className="block text-slate-600 font-medium mb-1">Página de Destino</label>
                    <select value={hotspot.action.targetPageId} onChange={e => handleNavActionChange(e.target.value)} className={`w-full bg-white border rounded-lg px-3 py-2 ${isInvalid ? 'border-red-500' : 'border-rose-200'}`}>
                        {project.pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            )}

            {hotspot.action.type === 'externalLink' && (
                <div className="space-y-2">
                    <input type="url" value={hotspot.action.url} onChange={e => hotspot.action.type === 'externalLink' && handleActionChange({ ...hotspot.action, url: e.target.value })} placeholder="https://exemplo.com" className="w-full bg-white border border-rose-200 rounded-lg px-3 py-2" />
                     <label className="flex items-center gap-2 text-slate-600">
                        <input type="checkbox" checked={hotspot.action.newTab} onChange={e => hotspot.action.type === 'externalLink' && handleActionChange({ ...hotspot.action, newTab: e.target.checked })} className="rounded text-pink-600" />
                        Abrir em nova aba
                    </label>
                </div>
            )}

            {page.background.type === 'video' && (
                 <label className="flex items-center gap-2 text-slate-600">
                    <input type="checkbox" checked={!!hotspot.showAfterVideoEnd} onChange={e => handleHotspotChange({ showAfterVideoEnd: e.target.checked })} className="rounded text-pink-600" />
                    Aparecer após o vídeo
                </label>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-rose-200">
                <button onClick={() => duplicateHotspot(page.id, hotspot.id)} className="flex-1 flex items-center justify-center gap-2 p-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600">
                    <i data-lucide="copy" className="w-4 h-4"></i> Duplicar
                </button>
                <button onClick={() => deleteHotspot(page.id, hotspot.id)} className="flex-1 flex items-center justify-center gap-2 p-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
                   <i data-lucide="trash-2" className="w-4 h-4"></i> Excluir
                </button>
            </div>
        </div>
    );
}