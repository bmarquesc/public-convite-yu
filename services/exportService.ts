
import { Project, ConfirmationMode } from '../types';
import { getHtmlTemplate, getCssTemplate, getJsTemplate } from './viewerTemplates';

declare const JSZip: any;

async function fileToUin8Array(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export async function exportToZip(project: Project) {
  if (typeof JSZip === 'undefined') {
    throw new Error('JSZip library is not loaded. Please check your internet connection and try again.');
  }
  const zip = new JSZip();
  const assetsFolder = zip.folder("assets");
  if (!assetsFolder) {
    throw new Error("Could not create assets folder in zip.");
  }
  
  const processedProject = JSON.parse(JSON.stringify(project));
  const assetMap = new Map<File, string>();
  let assetCounter = 0;

  for (const page of processedProject.pages) {
    const originalPage = project.pages.find(p => p.id === page.id);
    if (originalPage?.background.file) {
      const file = originalPage.background.file;
      let path = assetMap.get(file);
      if (!path) {
          const extension = file.name.split('.').pop() || 'bin';
          path = `media_${assetCounter++}.${extension}`;
          assetMap.set(file, path);
          const content = await fileToUin8Array(file);
          assetsFolder.file(path, content);
      }
      page.background.src = `assets/${path}`;
      delete page.background.file;
    }
  }

  if (project.settings.backgroundMusic?.file) {
    const file = project.settings.backgroundMusic.file;
    let path = assetMap.get(file);
    if (!path) {
        const extension = file.name.split('.').pop() || 'mp3';
        path = `music_${assetCounter++}.${extension}`;
        assetMap.set(file, path);
        const content = await fileToUin8Array(file);
        assetsFolder.file(path, content);
    }
    processedProject.settings.backgroundMusic.src = `assets/${path}`;
    delete processedProject.settings.backgroundMusic.file;
  }
  
  for (const page of processedProject.pages) {
      for (const hotspot of page.hotspots) {
          if (hotspot.action.type === 'rsvp') {
              if (processedProject.settings.confirmationMode === ConfirmationMode.WHATSAPP) {
                  const number = processedProject.settings.whatsapp.number.replace(/\D/g, '');
                  const message = encodeURIComponent(processedProject.settings.whatsapp.message);
                  hotspot.action = { type: 'externalLink', url: `https://wa.me/${number}?text=${message}`, newTab: true };
              } else {
                  hotspot.action = { type: 'externalLink', url: processedProject.settings.formUrl, newTab: true };
              }
          } else if (hotspot.action.type === 'map') {
              hotspot.action = { type: 'externalLink', url: processedProject.settings.mapUrl, newTab: true };
          }
      }
  }

  zip.file("config.json", JSON.stringify(processedProject, null, 2));
  zip.file("index.html", getHtmlTemplate(project.name));
  zip.file("style.css", getCssTemplate());
  zip.file("app.js", getJsTemplate());

  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = "convite-interativo.zip";
  a.click();
  URL.revokeObjectURL(url);
}