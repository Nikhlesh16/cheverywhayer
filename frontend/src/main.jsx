import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { Amplify } from 'aws-amplify'

const useMock = import.meta.env.VITE_USE_MOCK === 'true'

if (!useMock) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
        userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
      },
    },
  })
}

createRoot(document.getElementById('root')).render(<App useMock={useMock} />)
