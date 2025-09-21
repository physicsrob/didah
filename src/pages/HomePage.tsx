import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const navigate = useNavigate()

  const handleStartSession = () => {
    navigate('/session')
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#1a1a1a',
      color: 'white',
      fontFamily: 'monospace'
    }}>
      <h1 style={{
        fontSize: '4rem',
        marginBottom: '2rem',
        fontWeight: 'bold',
        letterSpacing: '0.1em'
      }}>
        CodeBeat
      </h1>

      <button
        onClick={handleStartSession}
        style={{
          fontSize: '1.5rem',
          padding: '1rem 2rem',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontFamily: 'monospace',
          letterSpacing: '0.05em',
          transition: 'background-color 0.2s'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#45a049'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = '#4CAF50'
        }}
      >
        Start Session
      </button>
    </div>
  )
}