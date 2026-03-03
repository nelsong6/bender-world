import { useState, useEffect, useCallback } from 'react';
import { setAuthToken } from '../api/client';

// ---------------------------------------------------------------------------
// Google Identity Services type declarations
// ---------------------------------------------------------------------------

interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
  clientId?: string;
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: string;
}

interface GoogleButtonConfiguration {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  width?: number;
}

interface GoogleAccountsId {
  initialize: (config: GoogleIdConfiguration) => void;
  renderButton: (parent: HTMLElement, config: GoogleButtonConfiguration) => void;
  prompt: () => void;
  disableAutoSelect: () => void;
  revoke: (hint: string, callback: (done: { successful: boolean }) => void) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

// ---------------------------------------------------------------------------
// JWT decode helper (decode payload without verification)
// ---------------------------------------------------------------------------

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthUser {
  name: string;
  email: string;
  picture: string;
  credential: string;
}

export interface UseAuthReturn {
  user: AuthUser | null;
  signIn: () => void;
  signOut: () => void;
  /** Ref callback to attach the Google button to a DOM element */
  renderGoogleButton: (el: HTMLElement | null) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'benderworld_auth_user';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [buttonEl, setButtonEl] = useState<HTMLElement | null>(null);

  // Persist user to localStorage whenever it changes
  const updateUser = useCallback((newUser: AuthUser | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      setAuthToken(newUser.credential);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setAuthToken(null);
    }
  }, []);

  // Handle credential response from Google
  const handleCredentialResponse = useCallback(
    (response: GoogleCredentialResponse) => {
      const payload = decodeJwtPayload(response.credential);
      const authUser: AuthUser = {
        name: (payload.name as string) || 'Unknown',
        email: (payload.email as string) || '',
        picture: (payload.picture as string) || '',
        credential: response.credential,
      };
      updateUser(authUser);
    },
    [updateUser],
  );

  // Initialize on mount: restore from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: AuthUser = JSON.parse(stored);
        if (parsed.credential) {
          setUser(parsed);
          setAuthToken(parsed.credential);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Load Google Identity Services script and initialize
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const initializeGsi = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
      });

      // Render button if element is available
      if (buttonEl) {
        window.google.accounts.id.renderButton(buttonEl, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
        });
      }
    };

    // If GSI script already loaded
    if (window.google?.accounts?.id) {
      initializeGsi();
      return;
    }

    // Load the GSI script
    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGsi;
      document.head.appendChild(script);
    } else {
      // Script exists but may not have loaded yet
      existingScript.addEventListener('load', initializeGsi);
      // Try in case it already loaded
      initializeGsi();
    }
  }, [handleCredentialResponse, buttonEl]);

  // Sign in: trigger Google One Tap prompt
  const signIn = useCallback(() => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    }
  }, []);

  // Sign out: clear everything
  const signOut = useCallback(() => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
      if (user?.email) {
        window.google.accounts.id.revoke(user.email, () => {});
      }
    }
    updateUser(null);
  }, [updateUser, user]);

  // Ref callback for the Google sign-in button container
  const renderGoogleButton = useCallback((el: HTMLElement | null) => {
    setButtonEl(el);
  }, []);

  return { user, signIn, signOut, renderGoogleButton };
}
