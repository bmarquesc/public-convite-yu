
import React, { useContext, useState, useEffect, useRef } from 'react';
import { ProjectContext } from '../App';
import { Hotspot, Rect } from '../types';

interface HotspotProps {
  hotspot: Hotspot;
  pageId: string;
  previewRef: React.RefObject<HTMLDivElement>;
}

type DragState = {
  type: 'move' | 'resize-br' | 'resize-bl' | 'resize-tr' | 'resize-tl' | 'resize-t' | 'resize-b' | 'resize-l' | 'resize-r';
  startX: number;
  startY: number;
  initialRect: Rect;
};

const HotspotComponent: React.FC<HotspotProps> = ({ hotspot, pageId, previewRef }) => {
  const context = useContext(ProjectContext);
  if (!context) return null;
  const { selectedHotspotId, setSelectedHotspotId, updateHotspot } = context;

  const [dragState, setDragState] = useState<DragState | null>(null);
  const isSelected = selectedHotspotId === hotspot.id;
  const hotspotRef = useRef<HTMLDivElement>(null);
  
  const isInvalid = hotspot.action.type === 'navigate' && hotspot.action.invalid;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, type: DragState['type']) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedHotspotId(hotspot.id);

    if (previewRef.current) {
      setDragState({
        type,
        startX: e.clientX,
        startY: e.clientY,
        initialRect: hotspot.rect,
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState || !previewRef.current) return;

      const previewBounds = previewRef.current.getBoundingClientRect();
      const dx = ((e.clientX - dragState.startX) / previewBounds.width) * 100;
      const dy = ((e.clientY - dragState.startY) / previewBounds.height) * 100;
      const { initialRect } = dragState;

      let newRect = { ...initialRect };

      switch (dragState.type) {
        case 'move': newRect.x = initialRect.x + dx; newRect.y = initialRect.y + dy; break;
        case 'resize-br': newRect.width = initialRect.width + dx; newRect.height = initialRect.height + dy; break;
        case 'resize-bl': newRect.x = initialRect.x + dx; newRect.width = initialRect.width - dx; newRect.height = initialRect.height + dy; break;
        case 'resize-tr': newRect.y = initialRect.y + dy; newRect.width = initialRect.width + dx; newRect.height = initialRect.height - dy; break;
        case 'resize-tl': newRect.x = initialRect.x + dx; newRect.y = initialRect.y + dy; newRect.width = initialRect.width - dx; newRect.height = initialRect.height - dy; break;
      }
      
      newRect.x = Math.max(0, Math.min(100 - newRect.width, newRect.x));
      newRect.y = Math.max(0, Math.min(100 - newRect.height, newRect.y));
      newRect.width = Math.max(5, Math.min(100 - newRect.x, newRect.width));
      newRect.height = Math.max(5, Math.min(100 - newRect.y, newRect.height));
      
      updateHotspot(pageId, hotspot.id, { rect: newRect });
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, pageId, hotspot.id, previewRef, updateHotspot]);


  const handleDivClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setSelectedHotspotId(hotspot.id);
  };
  
  const resizeHandleClasses = 'absolute bg-white border-2 border-pink-500 w-3 h-3 -m-1.5 rounded-full';
  
  const borderStyle = isInvalid
    ? 'border-2 border-red-500 bg-red-500/30'
    : isSelected
    ? 'border-2 border-pink-500 bg-pink-500/30'
    : 'border border-dashed border-pink-900/50';

  return (
    <div
      ref={hotspotRef}
      className={`absolute select-none cursor-move rounded-md ${borderStyle}`}
      style={{ left: `${hotspot.rect.x}%`, top: `${hotspot.rect.y}%`, width: `${hotspot.rect.width}%`, height: `${hotspot.rect.height}%` }}
      onMouseDown={(e) => handleMouseDown(e, 'move')}
      onClick={handleDivClick}
      title={isInvalid ? 'Ação inválida: a página de destino foi excluída.' : hotspot.name}
    >
        <div className="w-full h-full flex items-center justify-center p-1">
            <span className={`text-white text-xs truncate px-1 py-0.5 rounded ${isInvalid ? 'bg-red-800/80' : 'bg-pink-900/70'}`}>{hotspot.name}</span>
        </div>
      {isSelected && !isInvalid && (
        <>
            <div className={`${resizeHandleClasses} top-0 left-0 cursor-nwse-resize`} onMouseDown={(e) => handleMouseDown(e, 'resize-tl')}/>
            <div className={`${resizeHandleClasses} top-0 right-0 cursor-nesw-resize`} onMouseDown={(e) => handleMouseDown(e, 'resize-tr')}/>
            <div className={`${resizeHandleClasses} bottom-0 left-0 cursor-nesw-resize`} onMouseDown={(e) => handleMouseDown(e, 'resize-bl')}/>
            <div className={`${resizeHandleClasses} bottom-0 right-0 cursor-nwse-resize`} onMouseDown={(e) => handleMouseDown(e, 'resize-br')}/>
        </>
      )}
    </div>
  );
}

export default HotspotComponent;