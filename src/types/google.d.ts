import '@types/google-one-tap'

declare global {
  interface Window {
    google?: typeof google
  }
}