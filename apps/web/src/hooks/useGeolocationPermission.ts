import { useState, useEffect } from 'react';

export type GeolocationPermissionState =
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'unsupported';

export function useGeolocationPermission() {
  const [permission, setPermission] =
    useState<GeolocationPermissionState>('prompt');

  useEffect(() => {
    // Check if Permissions API is supported (Safari doesn't support it)
    if (!navigator.permissions) {
      setPermission('unsupported');
      return;
    }

    let permissionStatus: PermissionStatus | null = null;

    const handleChange = () => {
      if (permissionStatus) {
        setPermission(permissionStatus.state as GeolocationPermissionState);
      }
    };

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        permissionStatus = status;
        setPermission(status.state as GeolocationPermissionState);

        // Track state changes
        status.addEventListener('change', handleChange);
      })
      .catch(() => {
        // Safari and some browsers don't support geolocation permission query
        setPermission('unsupported');
      });

    return () => {
      if (permissionStatus) {
        permissionStatus.removeEventListener('change', handleChange);
      }
    };
  }, []);

  return permission;
}
