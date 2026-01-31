
import React, { useContext, useRef, useEffect } from 'react';
import { ProjectContext } from '../App';
import { ConfirmationMode } from '../types';
import { handleFileUpload } from '../utils/fileUtils';

export default function SettingsPanel() {
  const context = useContext(ProjectContext);
  if (!context) return null;
  
  const { project, updateProject } = context;
  const { settings } = project;
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('whatsapp.')) {
        const key = name.split('.')[1] as keyof typeof settings.whatsapp;
        updateProject({ ...project, settings: { ...settings, whatsapp: { ...settings.whatsapp, [key]: value } } });
    } else {
        updateProject({ ...project, settings: { ...settings, [name]: value } });
    }
  };

  const handleMusicSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    let val: string | number | boolean = type === 'checkbox' ? checked : value;
    
    if (name === 'volume' || name === 'duckVolume') {
        val = parseFloat(value as string) / 100;
    }

    updateProject({ ...project, settings: { ...settings, backgroundMusic: { ...settings.backgroundMusic, [name]: val } } });
  };

  const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const { src } = await handleFileUpload(file);
      updateProject({
        ...project,
        settings: { ...settings, backgroundMusic: { ...settings.backgroundMusic, src, file } }
      });
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = settings.backgroundMusic.volume;
      if (settings.backgroundMusic.src && !settings.backgroundMusic.src.startsWith('blob:')) {
        audioRef.current.load();
      }
    }
  }, [settings.backgroundMusic.src, settings.backgroundMusic.volume]);

  return (
    <div className="p-4 space-y-6 text-sm">
        <h3 className="text-lg font-semibold text-pink-900 mb-4">Configurações Globais</h3>

        <div>
            <label className="block text-slate-600 font-medium mb-1">URL Google Maps</label>
            <input type="text" name="mapUrl" value={settings.mapUrl} onChange={handleChange} className="w-full bg-white border border-rose-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-pink-500 focus:border-pink-500"/>
        </div>

        <div className="p-3 bg-rose-100/50 rounded-lg space-y-4">
            <h4 className="font-semibold text-pink-800">Música de Fundo</h4>
            <input type="file" accept="audio/*" onChange={handleMusicUpload} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-pink-500 file:text-white hover:file:bg-pink-600 cursor-pointer"/>
            {settings.backgroundMusic.src && (
                <div>
                    <audio ref={audioRef} src={settings.backgroundMusic.src} controls className="w-full h-8 mt-2" />
                    <div className="space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                            <label className="text-slate-600">Volume</label>
                            <span className="text-pink-800 font-medium">{Math.round(settings.backgroundMusic.volume * 100)}</span>
                        </div>
                        <input type="range" min="0" max="100" name="volume" value={settings.backgroundMusic.volume * 100} onChange={handleMusicSettingsChange} className="w-full" />
                        
                        <label className="flex items-center gap-2"><input type="checkbox" name="loop" checked={settings.backgroundMusic.loop} onChange={handleMusicSettingsChange} className="rounded text-pink-600" /> Loop</label>
                        <label className="flex items-center gap-2"><input type="checkbox" name="autoplay" checked={settings.backgroundMusic.autoplay} onChange={handleMusicSettingsChange} className="rounded text-pink-600" /> Iniciar no primeiro clique</label>
                        <label className="flex items-center gap-2"><input type="checkbox" name="stopOnVideo" checked={settings.backgroundMusic.stopOnVideo} onChange={handleMusicSettingsChange} className="rounded text-pink-600" /> Parar música durante vídeo</label>
                        <label className="flex items-center gap-2"><input type="checkbox" name="duckOnVideo" checked={settings.backgroundMusic.duckOnVideo} onChange={handleMusicSettingsChange} className="rounded text-pink-600" /> Reduzir volume durante vídeo</label>
                        
                        {settings.backgroundMusic.duckOnVideo && (
                            <div>
                                <div className="flex items-center justify-between">
                                    <label className="text-slate-600">Volume reduzido</label>
                                    <span className="text-pink-800 font-medium">{Math.round(settings.backgroundMusic.duckVolume * 100)}%</span>
                                </div>
                                <input type="range" min="0" max="100" name="duckVolume" value={settings.backgroundMusic.duckVolume * 100} onChange={handleMusicSettingsChange} className="w-full" />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        <div>
            <label className="block text-slate-600 font-medium mb-1">Modo de Confirmação</label>
            <select name="confirmationMode" value={settings.confirmationMode} onChange={handleChange} className="w-full bg-white border border-rose-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-pink-500 focus:border-pink-500">
                <option value={ConfirmationMode.WHATSAPP}>WhatsApp</option>
                <option value={ConfirmationMode.FORM}>Formulário</option>
            </select>
        </div>

        {settings.confirmationMode === ConfirmationMode.WHATSAPP && (
            <div className="p-3 bg-rose-100/50 rounded-lg space-y-4">
                <h4 className="font-semibold text-pink-800">Configurações do WhatsApp</h4>
                <div>
                    <label className="block text-slate-600 font-medium mb-1">Número (com DDI)</label>
                    <input type="tel" name="whatsapp.number" value={settings.whatsapp.number} onChange={handleChange} placeholder="5511999999999" className="w-full bg-white border-rose-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-pink-500 focus:border-pink-500"/>
                </div>
                <div>
                    <label className="block text-slate-600 font-medium mb-1">Mensagem Padrão</label>
                    <textarea name="whatsapp.message" value={settings.whatsapp.message} onChange={handleChange} rows={3} className="w-full bg-white border-rose-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-pink-500 focus:border-pink-500"></textarea>
                </div>
            </div>
        )}

        {settings.confirmationMode === ConfirmationMode.FORM && (
             <div className="p-3 bg-rose-100/50 rounded-lg space-y-4">
                <h4 className="font-semibold text-pink-800">Configuração do Formulário</h4>
                <div>
                    <label className="block text-slate-600 font-medium mb-1">URL do Formulário</label>
                    <input type="url" name="formUrl" value={settings.formUrl} onChange={handleChange} placeholder="https://forms.gle/..." className="w-full bg-white border-rose-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-pink-500 focus:border-pink-500"/>
                </div>
            </div>
        )}
    </div>
  );
}