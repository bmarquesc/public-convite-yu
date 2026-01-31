
export type PageType = 'cover' | 'video' | 'hub' | 'internal';

export type Action = 
  | { type: 'navigate'; targetPageId: string; invalid?: boolean }
  | { type: 'externalLink'; url: string; newTab: boolean }
  | { type: 'rsvp' }
  | { type: 'map' };

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Hotspot {
  id: string;
  name: string;
  rect: Rect;
  action: Action;
  showAfterVideoEnd?: boolean;
}

export interface Background {
  type: 'image' | 'video';
  src: string; // dataURL or external URL
  file?: File;
  videoSettings?: {
    autoplay: boolean;
    loop: boolean;
    muted: boolean;
    controls: boolean;
  };
}

export interface Page {
  id: string;
  name: string;
  type: PageType;
  background: Background;
  hotspots: Hotspot[];
}

export enum ConfirmationMode {
  WHATSAPP = 'whatsapp',
  FORM = 'form',
}

export interface GlobalSettings {
  mapUrl: string;
  confirmationMode: ConfirmationMode;
  whatsapp: {
    number: string;
    message: string;
  };
  formUrl: string;
  backgroundMusic: {
    src: string;
    file?: File;
    volume: number;
    loop: boolean;
    autoplay: boolean;
    stopOnVideo: boolean;
    duckOnVideo: boolean;
    duckVolume: number;
  };
}

export interface Project {
  name: string;
  pages: Page[];
  settings: GlobalSettings;
}

// Deprecated Screen type, using Page instead.
export type Screen = Page;