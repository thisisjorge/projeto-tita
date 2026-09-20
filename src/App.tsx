import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router.js';
import './ui/tokens/index.css';

export function App(): React.JSX.Element {
  if (!router) {
    return <div id="app-loading">Carregando Projeto Titã...</div>;
  }
  return <RouterProvider router={router} />;
}
