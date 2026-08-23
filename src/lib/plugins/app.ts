import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '../supabase';

/**
 * Initializes deep linking for native mobile apps.
 * Listens for custom URL schema (e.g. com.school.preprimary://)
 * and passes the session data back to Supabase.
 */
export function initializeDeepLinking() {
  if (Capacitor.isNativePlatform()) {
    CapacitorApp.addListener('appUrlOpen', (event) => {
      console.log('App opened with URL:', event.url);
      
      // Example url: com.school.preprimary://login-callback#access_token=...
      // Supabase needs to process this hash.
      if (event.url.includes('#access_token') || event.url.includes('?access_token')) {
        // We can manually parse or just let Supabase's getSession handle it by
        // overriding the window location (less reliable on mobile).
        // The best native approach for Supabase v2 is setSession or just let the hash router process it
        // We'll strip the custom scheme and replace it with a valid web-like URL to feed to supabase or router.
        const hashStart = event.url.indexOf('#');
        const queryStart = event.url.indexOf('?');
        
        let hashOrQuery = '';
        if (hashStart !== -1) {
          hashOrQuery = event.url.substring(hashStart);
        } else if (queryStart !== -1) {
          hashOrQuery = event.url.substring(queryStart);
        }

        if (hashOrQuery) {
          // Pass it to the router or supabase
          window.location.hash = hashOrQuery;
          // Supabase's default auth listener should pick up the hash change
        }
      }
    });
  }
}
