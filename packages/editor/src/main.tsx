import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/globals.css';

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <h1 className="text-2xl font-bold p-4">Old World Charm</h1>
      <p className="p-4 text-muted-foreground">
        Visual Website Builder - Editor interface coming soon...
      </p>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}