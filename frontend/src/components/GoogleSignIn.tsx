import React from 'react';
import type { AuthUser } from '../hooks/use-auth';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GoogleSignInProps {
  user: AuthUser | null;
  onSignIn: () => void;
  onSignOut: () => void;
  renderGoogleButton: (el: HTMLElement | null) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const GoogleSignIn: React.FC<GoogleSignInProps> = ({
  user,
  onSignIn,
  onSignOut,
  renderGoogleButton,
}) => {
  if (user) {
    return (
      <div style={styles.signedInContainer}>
        <div style={styles.userInfo}>
          {user.picture && (
            <img
              src={user.picture}
              alt={user.name}
              style={styles.avatar}
              referrerPolicy="no-referrer"
            />
          )}
          <span style={styles.userName}>{user.name}</span>
        </div>
        <button onClick={onSignOut} style={styles.signOutButton}>
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div style={styles.signInContainer}>
      {/* Google rendered button container */}
      <div
        ref={(el) => renderGoogleButton(el)}
        style={styles.googleButtonWrapper}
      />
      {/* Fallback manual button in case Google button doesn't render */}
      <button onClick={onSignIn} style={styles.fallbackSignInButton}>
        Sign In
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  signedInContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: '1px solid #444',
  },
  userName: {
    color: '#e0e0e0',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  signOutButton: {
    padding: '4px 12px',
    backgroundColor: 'transparent',
    color: '#aaa',
    border: '1px solid #555',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 12,
    transition: 'border-color 0.2s',
  },
  signInContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  googleButtonWrapper: {
    minHeight: 36,
  },
  fallbackSignInButton: {
    padding: '6px 16px',
    backgroundColor: '#2a2a4a',
    color: '#e0e0e0',
    border: '1px solid #555',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 12,
    transition: 'background-color 0.2s',
  },
};
