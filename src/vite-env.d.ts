/// <reference types="vite/client" />

declare namespace google {
  interface CredentialResponse {
    credential: string
    select_by: string
  }

  namespace accounts {
    namespace id {
      interface IdConfiguration {
        client_id: string
        callback?: (response: google.CredentialResponse) => void
        auto_select?: boolean
        login_uri?: string
        native_callback?: (response: google.CredentialResponse) => void
        cancel_on_tap_outside?: boolean
        prompt_parent_id?: string
        nonce?: string
        context?: string
        state_cookie_domain?: string
        ux_mode?: "popup" | "redirect"
        allowed_parent_origin?: string | string[]
        intermediate_iframe_close_callback?: () => void
      }

      interface ButtonConfig {
        theme?: "outline" | "filled_blue" | "filled_black"
        size?: "large" | "medium" | "small"
        text?: "signin_with" | "signup_with" | "continue_with" | "signin"
        shape?: "rectangular" | "pill"
        logo_alignment?: "left" | "center"
        width?: number
        locale?: string
      }

      function initialize(config: IdConfiguration): void
      function prompt(momentListener?: (notification: PromptMomentNotification) => void): void
      function renderButton(element: HTMLElement, config: ButtonConfig): void
      function disableAutoSelect(): void
      function storeCredential(credential: Credential, callback?: () => void): void
      function cancel(): void
      function revoke(email: string, done: () => void): void

      interface PromptMomentNotification {
        getMomentType(): "display" | "skipped" | "dismissed"
        getNotDisplayedReason():
          | "browser_not_supported"
          | "invalid_client"
          | "missing_client_id"
          | "opt_out_or_no_session"
          | "secure_http_required"
          | "suppressed_by_user"
          | "unregistered_origin"
          | "unknown_reason"
        getSkippedReason():
          | "auto_cancel"
          | "user_cancel"
          | "tap_outside"
          | "issuing_failed"
        getDismissedReason(): "credential_returned" | "cancel_called" | "flow_restarted"
        isDisplayMoment(): boolean
        isDisplayed(): boolean
        isNotDisplayed(): boolean
        isSkippedMoment(): boolean
      }
    }
  }
}

interface Window {
  google: typeof google
}
