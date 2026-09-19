import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// шрифти зі своєї папки (latin + cyrillic), без Google Fonts
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/cyrillic-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/cyrillic-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/cyrillic-700.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/cyrillic-500.css';
import '@fontsource/cormorant-garamond/latin-500-italic.css';
import '@fontsource/cormorant-garamond/cyrillic-500-italic.css';
import '@fontsource/cormorant-garamond/latin-600-italic.css';
import '@fontsource/cormorant-garamond/cyrillic-600-italic.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/cormorant-garamond/cyrillic-600.css';
import '@fontsource/caveat/latin-600.css';
import '@fontsource/caveat/cyrillic-600.css';
import '@fontsource/caveat/latin-700.css';
import '@fontsource/caveat/cyrillic-700.css';
import '@fontsource/lora/latin-400.css';
import '@fontsource/lora/cyrillic-400.css';

import './styles/tokens.css';
import './styles/base.css';
import './styles/animations.css';
import './styles/pages.css';

import { App } from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
