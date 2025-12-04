import React, { useState, useEffect } from 'react'
import { signIn, signUp, confirmSignUp, signOut, getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth'

export default function AuthPanel({ useMock, onAuthChange }) {
  const [mode, setMode] = useState('login') // login | register | confirm
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (useMock) {
      const mockUser = { username: 'mock-user', email: 'mock@example.com' }
      setUser(mockUser)
      onAuthChange && onAuthChange(mockUser)
      return
    }
    getCurrentUser()
      .then(async (u) => {
        const attrs = await fetchUserAttributes()
        const fullUser = { ...u, email: attrs.email }
        setUser(fullUser)
        onAuthChange && onAuthChange(fullUser)
      })
      .catch(() => {})
  }, [useMock])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signIn({ username: email, password })
      const u = await getCurrentUser()
      const attrs = await fetchUserAttributes()
      const fullUser = { ...u, email: attrs.email }
      setUser(fullUser)
      onAuthChange && onAuthChange(fullUser)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally { setLoading(false) }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signUp({ username: email, password, options: { userAttributes: { email } } })
      setMode('confirm')
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  async function handleConfirm(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await confirmSignUp({ username: email, confirmationCode: code })
      setMode('login')
    } catch (err) {
      setError(err.message || 'Confirmation failed')
    } finally { setLoading(false) }
  }

  async function handleLogout() {
    await signOut()
    setUser(null)
    onAuthChange && onAuthChange(null)
  }

  if (user) {
    return (
      <div className="auth-panel logged-in">
        <span>{user.email || user.username}</span>
        {!useMock && <button onClick={handleLogout}>Logout</button>}
      </div>
    )
  }

  if (useMock) return null

  return (
    <div className="auth-panel">
      {error && <div className="error">{error}</div>}
      {mode === 'login' && (
        <form onSubmit={handleLogin}>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button disabled={loading}>Login</button>
          <div className="switch" onClick={() => setMode('register')}>Need an account? Register</div>
        </form>
      )}
      {mode === 'register' && (
        <form onSubmit={handleRegister}>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button disabled={loading}>Register</button>
          <div className="switch" onClick={() => setMode('login')}>Have an account? Login</div>
        </form>
      )}
      {mode === 'confirm' && (
        <form onSubmit={handleConfirm}>
          <p>Check email for code</p>
          <input placeholder="Confirmation code" value={code} onChange={(e) => setCode(e.target.value)} />
          <button disabled={loading}>Confirm</button>
        </form>
      )}
    </div>
  )
}
