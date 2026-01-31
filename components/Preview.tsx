
import React, { useContext, useRef } from 'react';
import { ProjectContext } from '../App';
import HotspotComponent from './HotspotComponent';
import { Hotspot, Page } from '../types';

export default function Preview() {
  const context = useContext(ProjectContext);
  const previewRef = useRef<HTMLDivElement>(null);

  if (!context) return null;

  const { project, selectedPageId, setSelectedHotspotId } = context;
  const currentPage: Page | undefined = project.pages.find(p => p.id === selectedPageId);

  if (!currentPage) {
    return (
      <div className="aspect-[9/16] w-full max-w-sm bg-gray-700 rounded-lg flex items-center justify-center text-gray-400">
        Página não encontrada.
      </div>
    );
  }

  const background = currentPage.background;
  const pageId = currentPage.id;
  
  return (
    <div 
      className="aspect-[9/16] w-full max-w-sm bg-gray-700 rounded-lg shadow-2xl overflow-hidden relative"
      ref={previewRef}
      onClick={(e) => {
        if (e.target === previewRef.current) {
          setSelectedHotspotId(null);
        }
      }}
    >
      {background.type === 'image' && background.src && (
        <img src={background.src} alt={currentPage.name} className="absolute inset-0 w-full h-full object-cover" />
      )}
      {background.type === 'video' && background.src && (
        <video 
            key={background.src}
            src={background.src} 
            className="absolute inset-0 w-full h-full object-cover" 
            autoPlay={background.videoSettings?.autoplay}
            loop={background.videoSettings?.loop}
            muted={background.videoSettings?.muted}
            controls={background.videoSettings?.controls}
            playsInline
        />
      )}
      {!background.src && (
        <div className="w-full h-full flex items-center justify-center bg-gray-600">
            <p className="text-center text-gray-400 p-4">
                Envie uma imagem ou vídeo para esta tela.
            </p>
        </div>
      )}

      {currentPage.hotspots.map((hotspot: Hotspot) => (
        <HotspotComponent
          key={hotspot.id}
          hotspot={hotspot}
          pageId={pageId}
          previewRef={previewRef}
        />
      ))}
    </div>
  );
}