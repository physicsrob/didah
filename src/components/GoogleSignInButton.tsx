import { useEffect, useRef } from 'react'
import './GoogleSignInButton.css'

interface GoogleSignInButtonProps {
  onCredentialResponse: (response: google.CredentialResponse) => void
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ onCredentialResponse }) => {
  const buttonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

    // Don't render button if client ID is missing
    if (!clientId) {
      console.error('Cannot render Google Sign-In button: VITE_GOOGLE_CLIENT_ID is not set')
      return
    }

    if (buttonRef.current && window.google) {
      try {
        // Re-initialize with the callback to ensure it's properly connected
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: onCredentialResponse,
        })

        window.google.accounts.id.renderButton(
          buttonRef.current,
          {
            theme: 'outline',
            size: 'small',
            text: 'signin',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 80
          }
        )
      } catch (error) {
        console.error('Error rendering Google sign-in button:', error)
      }
    }
  }, [onCredentialResponse])

  return <div ref={buttonRef} className="google-signin-wrapper" />
}

export default GoogleSignInButton