import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();
export const isAndroid = platform === 'android';
export const isIOS = platform === 'ios';
export const isWeb = platform === 'web';

export async function initCapacitorPlugins() {
  if (!isNative) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Light });
    if (isAndroid) {
      await StatusBar.setBackgroundColor({ color: '#0066FF' });
    }
  } catch (e) {
    console.warn('StatusBar plugin not available:', e);
  }

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch (e) {
    console.warn('SplashScreen plugin not available:', e);
  }

  try {
    const { Keyboard } = await import('@capacitor/keyboard');
    Keyboard.addListener('keyboardWillShow', (info) => {
      document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
      document.body.classList.add('keyboard-open');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.style.setProperty('--keyboard-height', '0px');
      document.body.classList.remove('keyboard-open');
    });
  } catch (e) {
    console.warn('Keyboard plugin not available:', e);
  }

  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      }
    });
  } catch (e) {
    console.warn('App plugin not available:', e);
  }
}

export async function getDeviceLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    if (isNative) {
      const { Geolocation } = await import('@capacitor/geolocation');
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
    } else {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    }
  } catch {
    return null;
  }
}

export async function watchDeviceLocation(
  callback: (location: { latitude: number; longitude: number }) => void
): Promise<string | null> {
  try {
    if (isNative) {
      const { Geolocation } = await import('@capacitor/geolocation');
      const watchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true },
        (position, err) => {
          if (position && !err) {
            callback({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          }
        }
      );
      return watchId;
    } else {
      if (!navigator.geolocation) return null;
      const watchId = navigator.geolocation.watchPosition(
        (pos) => callback({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        null,
        { enableHighAccuracy: true }
      );
      return String(watchId);
    }
  } catch {
    return null;
  }
}

export async function stopWatchingLocation(watchId: string): Promise<void> {
  try {
    if (isNative) {
      const { Geolocation } = await import('@capacitor/geolocation');
      await Geolocation.clearWatch({ id: watchId });
    } else {
      navigator.geolocation.clearWatch(Number(watchId));
    }
  } catch {
    // silently fail
  }
}

export async function takePhoto(): Promise<{ dataUrl: string; format: string } | null> {
  try {
    if (isNative) {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 1024,
        height: 1024,
        correctOrientation: true
      });
      if (photo.dataUrl) {
        return { dataUrl: photo.dataUrl, format: photo.format };
      }
      return null;
    } else {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) {
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              dataUrl: reader.result as string,
              format: file.type.split('/')[1] || 'jpeg'
            });
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        };
        input.click();
      });
    }
  } catch {
    return null;
  }
}

export async function pickPhoto(): Promise<{ dataUrl: string; format: string } | null> {
  try {
    if (isNative) {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        width: 1024,
        height: 1024
      });
      if (photo.dataUrl) {
        return { dataUrl: photo.dataUrl, format: photo.format };
      }
      return null;
    } else {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) {
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              dataUrl: reader.result as string,
              format: file.type.split('/')[1] || 'jpeg'
            });
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        };
        input.click();
      });
    }
  } catch {
    return null;
  }
}

export async function triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'medium') {
  if (!isNative) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const styleMap = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy
    };
    await Haptics.impact({ style: styleMap[type] });
  } catch {
    // Haptics not available
  }
}

export async function checkNetworkStatus(): Promise<boolean> {
  try {
    if (isNative) {
      const { Network } = await import('@capacitor/network');
      const status = await Network.getStatus();
      return status.connected;
    }
    return navigator.onLine;
  } catch {
    return navigator.onLine;
  }
}

export async function onNetworkChange(
  callback: (connected: boolean) => void
): Promise<() => void> {
  try {
    if (isNative) {
      const { Network } = await import('@capacitor/network');
      const handle = await Network.addListener('networkStatusChange', (status) => {
        callback(status.connected);
      });
      return () => handle.remove();
    } else {
      const onlineHandler = () => callback(true);
      const offlineHandler = () => callback(false);
      window.addEventListener('online', onlineHandler);
      window.addEventListener('offline', offlineHandler);
      return () => {
        window.removeEventListener('online', onlineHandler);
        window.removeEventListener('offline', offlineHandler);
      };
    }
  } catch {
    const onlineHandler = () => callback(true);
    const offlineHandler = () => callback(false);
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    return () => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    };
  }
}

export async function initPushNotifications(): Promise<string | null> {
  if (!isNative) return null;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return null;

    await PushNotifications.register();

    return new Promise((resolve) => {
      PushNotifications.addListener('registration', (token) => {
        resolve(token.value);
      });
      PushNotifications.addListener('registrationError', () => {
        resolve(null);
      });
    });
  } catch {
    return null;
  }
}

export function onPushNotificationReceived(
  callback: (notification: { title?: string; body?: string; data?: Record<string, unknown> }) => void
): void {
  if (!isNative) return;
  import('@capacitor/push-notifications').then(({ PushNotifications }) => {
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      callback({
        title: notification.title || undefined,
        body: notification.body || undefined,
        data: notification.data as Record<string, unknown> | undefined
      });
    });
  }).catch(() => {});
}

export function onPushNotificationTapped(
  callback: (data?: Record<string, unknown>) => void
): void {
  if (!isNative) return;
  import('@capacitor/push-notifications').then(({ PushNotifications }) => {
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      callback(action.notification.data as Record<string, unknown> | undefined);
    });
  }).catch(() => {});
}
