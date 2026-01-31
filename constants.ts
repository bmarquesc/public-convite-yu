
import { Project, Page, ConfirmationMode, Hotspot } from './types';

const COVER_PAGE: Page = {
  id: 'cover',
  name: 'Tela 1: Carta',
  type: 'cover',
  background: { type: 'image', src: 'https://picsum.photos/seed/cover/540/960' },
  hotspots: [
    {
      id: 'hotspot_cover_1',
      name: 'Abrir Convite',
      rect: { x: 30, y: 70, width: 40, height: 10 },
      action: { type: 'navigate', targetPageId: 'video' }
    }
  ]
};

const VIDEO_PAGE: Page = {
  id: 'video',
  name: 'Tela 2: Vídeo',
  type: 'video',
  background: { 
    type: 'video', 
    src: '',
    videoSettings: {
      autoplay: true,
      loop: true,
      muted: true,
      controls: false,
    }
  },
  hotspots: [
    {
      id: 'hotspot_video_1',
      name: 'Continuar',
      rect: { x: 30, y: 80, width: 40, height: 10 },
      action: { type: 'navigate', targetPageId: 'hub' },
      showAfterVideoEnd: false,
    }
  ]
};

const HUB_PAGE: Page = {
  id: 'hub',
  name: 'Tela HUB: Principal',
  type: 'hub',
  background: { type: 'image', src: 'https://picsum.photos/seed/hub/540/960' },
  hotspots: [
    {
      id: 'hotspot_hub_1',
      name: 'Confirmar Presença',
      rect: { x: 25, y: 60, width: 50, height: 8 },
      action: { type: 'rsvp' }
    },
    {
      id: 'hotspot_hub_2',
      name: 'Local da Festa',
      rect: { x: 25, y: 70, width: 50, height: 8 },
      action: { type: 'map' }
    },
    {
      id: 'hotspot_hub_3',
      name: 'Sugestão de Presente',
      rect: { x: 25, y: 80, width: 50, height: 8 },
      action: { type: 'externalLink', url: '', newTab: true }
    },
  ]
};

export const INITIAL_PROJECT: Project = {
  name: 'Novo Convite',
  pages: [COVER_PAGE, VIDEO_PAGE, HUB_PAGE],
  settings: {
    mapUrl: '',
    confirmationMode: ConfirmationMode.WHATSAPP,
    whatsapp: {
      number: '5511999999999',
      message: 'Olá! Confirmo minha presença no evento.'
    },
    formUrl: '',
    backgroundMusic: {
      src: '',
      volume: 0.5,
      loop: true,
      autoplay: true,
      stopOnVideo: false,
      duckOnVideo: false,
      duckVolume: 0.2
    }
  }
};