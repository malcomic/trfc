import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.js'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { FontProvider } from './context/FontContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <FontProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </FontProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
