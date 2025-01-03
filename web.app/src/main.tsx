import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext'
import './index.css'

const rootElement = document.getElementById('root')!;
const root = createRoot(rootElement);

if (process.env.NODE_ENV === 'development') {
  root.render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>
  );
} else {
  root.render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}
