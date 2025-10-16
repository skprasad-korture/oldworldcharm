import React from 'react';
import ReactDOM from 'react-dom/client';
import { VisualEditor } from './components/editor';
import { registerSampleComponents } from './utils/sampleComponents';
import './styles/globals.css';

// Register sample components for testing
registerSampleComponents();

function App() {
  return <VisualEditor />;
}

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
