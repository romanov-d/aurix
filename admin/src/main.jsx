import '@/components/keenicons/assets/styles.css';
import './css/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { IconContext } from '@phosphor-icons/react';
import { App } from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Все Phosphor-иконки по умолчанию duotone */}
    <IconContext.Provider value={{ weight: 'duotone' }}>
      <App />
    </IconContext.Provider>
  </StrictMode>,
);
