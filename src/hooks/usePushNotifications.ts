import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function uint8ArrayToUrlBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window.btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export const usePushNotifications = () => {
  const { user } = useAuth();

  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [subscribed, setSubscribed] = useState(false);
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(false);

  const renewalInProgress = useRef(false);

  useEffect(() => {
    setSupported(
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      typeof Notification !== 'undefined'
    );
  }, []);

  useEffect(() => {
    if (!supported) return;

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  }, [supported]);

  const ensureSubscription = useCallback(async () => {
    if (
      !supported ||
      !user ||
      !VAPID_PUBLIC_KEY ||
      Notification.permission !== 'granted' ||
      renewalInProgress.current
    ) {
      return { success: false };
    }

    renewalInProgress.current = true;
    setLoading(true);

    try {
      const reg = await navigator.serviceWorker.ready;
      let subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        const existingKey = subscription.options.applicationServerKey;
        const existingKeyString = existingKey
          ? uint8ArrayToUrlBase64(new Uint8Array(existingKey))
          : '';

        if (existingKeyString !== VAPID_PUBLIC_KEY) {
          const oldEndpoint = subscription.endpoint;

          await subscription.unsubscribe();

          const { data: oldRows, error: lookupError } = await supabase
            .from('push_subscriptions')
            .select('id, subscription')
            .eq('user_id', user.id);

          if (lookupError) throw lookupError;

          const oldIds = (oldRows || [])
            .filter((row) => row.subscription?.endpoint === oldEndpoint)
            .map((row) => row.id);

          if (oldIds.length > 0) {
            const { error: deleteError } = await supabase
              .from('push_subscriptions')
              .delete()
              .in('id', oldIds);

            if (deleteError) throw deleteError;
          }

          subscription = null;
        }
      }

      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            user_id: user.id,
            subscription: subscription.toJSON(),
          },
          { onConflict: 'user_id,subscription' }
        );

      if (error) throw error;

      setSubscribed(true);
      return { success: true };
    } catch (err) {
      console.error('Push subscription renewal failed:', err);
      setSubscribed(false);
      return { success: false, error: err };
    } finally {
      setLoading(false);
      renewalInProgress.current = false;
    }
  }, [supported, user]);

  // Automatically repair or renew an existing subscription on app startup.
  useEffect(() => {
    if (!supported || !user) return;

    if (Notification.permission === 'granted') {
      setPermission('granted');
      ensureSubscription();
    } else {
      setSubscribed(false);
    }
  }, [supported, user, ensureSubscription]);

  const requestPermission = useCallback(async () => {
    if (!supported || !user || !VAPID_PUBLIC_KEY) {
      return { success: false };
    }

    setLoading(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        setSubscribed(false);
        setLoading(false);
        return { success: false, reason: 'denied' };
      }

      return await ensureSubscription();
    } catch (err) {
      console.error('Push subscription failed:', err);
      setLoading(false);
      return { success: false, error: err };
    }
  }, [supported, user, ensureSubscription]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return;

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();

        if (user) {
          const { data: rows, error: lookupError } = await supabase
            .from('push_subscriptions')
            .select('id, subscription')
            .eq('user_id', user.id);

          if (lookupError) throw lookupError;

          const ids = (rows || [])
            .filter((row) => row.subscription?.endpoint === endpoint)
            .map((row) => row.id);

          if (ids.length > 0) {
            const { error } = await supabase
              .from('push_subscriptions')
              .delete()
              .in('id', ids);

            if (error) throw error;
          }
        }
      }

      setSubscribed(false);
    } catch (err) {
      console.error('Unsubscribe failed:', err);
    }
  }, [supported, user]);

  return {
    supported,
    permission,
    subscribed,
    loading,
    requestPermission,
    unsubscribe,
  };
};
