import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import { googleClientId } from '../../config/site'
import { useTheme } from '../../context/ThemeContext'

interface GoogleButtonProps {
  onCredential: (credential: string) => void
  onError?: () => void
  text?: 'signin_with' | 'signup_with' | 'continue_with'
  width?: number
}

export const isGoogleEnabled = Boolean(googleClientId)

export default function GoogleButton({ onCredential, onError, text = 'continue_with', width = 320 }: GoogleButtonProps) {
  const { theme } = useTheme()
  if (!isGoogleEnabled) return null

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={(response) => {
            if (response.credential) onCredential(response.credential)
            else onError?.()
          }}
          onError={() => onError?.()}
          text={text}
          theme={theme === 'dark' ? 'filled_black' : 'outline'}
          shape="rectangular"
          size="large"
          width={width}
        />
      </div>
    </GoogleOAuthProvider>
  )
}
