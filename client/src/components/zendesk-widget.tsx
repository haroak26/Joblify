import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

export function ZendeskWidget() {
  const { user } = useAuth();

  useEffect(() => {
    const zendeskKey = import.meta.env.VITE_ZENDESK_KEY;
    const zendeskSubdomain = import.meta.env.VITE_ZENDESK_SUBDOMAIN;

    if (!zendeskKey || !zendeskSubdomain) {
      console.log('[Zendesk] Widget not configured');
      return;
    }

    // Load Zendesk Web Widget
    const script = document.createElement('script');
    script.id = 'ze-snippet';
    script.src = `https://static.zdassets.com/ekr/snippet.js?key=${zendeskKey}`;
    script.async = true;

    script.onload = () => {
      // Configure Zendesk widget
      if (window.zE) {
        // Hide widget initially if user is not logged in
        if (!user) {
          window.zE('webWidget', 'hide');
        } else {
          // Set user info for better support
          window.zE('webWidget', 'identify', {
            name: user.name || user.username,
            email: user.email,
          });

          // Set custom fields
          window.zE('webWidget', 'prefill', {
            name: {
              value: user.name || user.username,
            },
            email: {
              value: user.email,
            },
          });
        }

        // Customize widget appearance
        window.zE('webWidget', 'updateSettings', {
          webWidget: {
            color: {
              theme: '#6366f1', // Primary color
            },
            launcher: {
              chatLabel: {
                'en-US': 'Need Help?',
              },
            },
            contactForm: {
              title: {
                '*': 'Contact Support',
              },
            },
          },
        });
      }
    };

    document.body.appendChild(script);

    // Cleanup
    return () => {
      const existingScript = document.getElementById('ze-snippet');
      if (existingScript) {
        existingScript.remove();
      }
      // Reset Zendesk
      if (window.zE) {
        window.zE('webWidget', 'hide');
      }
    };
  }, [user]);

  return null; // This component doesn't render anything visible
}

// Type definitions for Zendesk
declare global {
  interface Window {
    zE?: (command: string, ...args: any[]) => void;
    zESettings?: any;
  }
}
