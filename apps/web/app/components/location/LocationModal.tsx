'use client';

import { useEffect, useState } from 'react';
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';

// leaflet.css loaded via CDN in layout.tsx

interface UserProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}

interface UserAddress {
  id: string;
  userId: string;
  label: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  area?: string;
  city: string;
  province?: string;
  postalCode?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
}

interface LocationModalProps {
  open: boolean;
  onClose: () => void;
  user: UserProfile | null;
  currentAddress: UserAddress | null;
  onAddressSaved: (address: UserAddress) => void;
}

interface SelectedLocation {
  latitude: number;
  longitude: number;
}

interface GeocodedAddress {
  addressLine1: string;
  area?: string;
  city: string;
  province?: string;
  postalCode?: string;
  country: string;
}

const defaultLocation: SelectedLocation = {
  latitude: 31.5204,
  longitude: 74.3587,
};

const markerIcon = L.icon({
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapController({
  location,
}: {
  location: SelectedLocation;
}) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([location.latitude, location.longitude], 16, {
      duration: 1,
    });
  }, [location, map]);

  return null;
}

function MapClickHandler({
  onLocationChange,
}: {
  onLocationChange: (location: SelectedLocation) => void;
}) {
  useMapEvents({
    click(event) {
      onLocationChange({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return null;
}

export default function LocationModal({
  open,
  onClose,
  user,
  currentAddress,
  onAddressSaved,
}: LocationModalProps) {
  const [selectedLocation, setSelectedLocation] =
    useState<SelectedLocation>(defaultLocation);

  const [addressDetails, setAddressDetails] =
    useState<GeocodedAddress | null>(null);

  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [saving, setSaving] = useState(false);

  const [locationError, setLocationError] = useState('');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    if (
      currentAddress?.latitude !== undefined &&
      currentAddress?.longitude !== undefined
    ) {
      setSelectedLocation({
        latitude: currentAddress.latitude,
        longitude: currentAddress.longitude,
      });

      setAddressDetails({
        addressLine1: currentAddress.addressLine1,
        area: currentAddress.area,
        city: currentAddress.city,
        province: currentAddress.province,
        postalCode: currentAddress.postalCode,
        country: currentAddress.country,
      });

      return;
    }

    setSelectedLocation(defaultLocation);
    setAddressDetails(null);
    setLocationError('');
    setSearchText('');
  }, [open, currentAddress]);

  useEffect(() => {
    if (!open) {
      return;
    }

    reverseGeocode(
      selectedLocation.latitude,
      selectedLocation.longitude,
    );
  }, [open]);

  const reverseGeocode = async (
    latitude: number,
    longitude: number,
  ) => {
    setLoadingAddress(true);
    setLocationError('');

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Unable to detect address');
      }

      const data = await response.json();

      const address = data.address || {};

      const city =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        '';

      const area =
        address.suburb ||
        address.neighbourhood ||
        address.residential ||
        address.quarter ||
        '';

      const addressLine1 =
        data.display_name ||
        `${city}${area ? `, ${area}` : ''}`;

      setAddressDetails({
        addressLine1,
        area,
        city,
        province:
          address.state ||
          address.province ||
          address.region ||
          '',
        postalCode: address.postcode || '',
        country: address.country || 'Pakistan',
      });
    } catch (error) {
      console.error('Reverse geocoding failed:', error);

      setAddressDetails(null);
      setLocationError(
        'Unable to detect the address. You can adjust the location and try again.',
      );
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleMapLocationChange = (
    location: SelectedLocation,
  ) => {
    setSelectedLocation(location);
    reverseGeocode(
      location.latitude,
      location.longitude,
    );
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(
        'Your browser does not support location services.',
      );
      return;
    }

    setLoadingLocation(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setSelectedLocation(location);

        reverseGeocode(
          location.latitude,
          location.longitude,
        );

        setLoadingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);

        setLoadingLocation(false);

        if (error.code === error.PERMISSION_DENIED) {
          setLocationError(
            'Location permission was denied. Please allow location access in your browser.',
          );
        } else if (
          error.code === error.POSITION_UNAVAILABLE
        ) {
          setLocationError(
            'Your current location could not be detected.',
          );
        } else if (
          error.code === error.TIMEOUT
        ) {
          setLocationError(
            'Location request timed out. Please try again.',
          );
        } else {
          setLocationError(
            'Unable to detect your current location.',
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  const handleSearch = async () => {
    const query = searchText.trim();

    if (!query) {
      return;
    }

    setLoadingAddress(true);
    setLocationError('');

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q=${encodeURIComponent(
          query,
        )}`,
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const results = await response.json();

      if (!results.length) {
        setLocationError(
          'Location not found. Try another search.',
        );
        return;
      }

      const result = results[0];

      const latitude = Number(result.lat);
      const longitude = Number(result.lon);

      const address = result.address || {};

      const city =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        '';

      const area =
        address.suburb ||
        address.neighbourhood ||
        address.residential ||
        address.quarter ||
        '';

      setSelectedLocation({
        latitude,
        longitude,
      });

      setAddressDetails({
        addressLine1:
          result.display_name ||
          `${city}${area ? `, ${area}` : ''}`,
        area,
        city,
        province:
          address.state ||
          address.province ||
          address.region ||
          '',
        postalCode: address.postcode || '',
        country: address.country || 'Pakistan',
      });
    } catch (error) {
      console.error('Location search failed:', error);

      setLocationError(
        'Unable to search location. Please try again.',
      );
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleConfirm = async () => {
    if (!user?.id) {
      setLocationError(
        'Please login before saving your delivery location.',
      );
      return;
    }

    if (!addressDetails?.city) {
      setLocationError(
        'Please select a valid delivery location first.',
      );
      return;
    }

    setSaving(true);
    setLocationError('');

    try {
      const response = await fetch(
        `https://tabibistan.org/addresses?userId=${user.id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            label: 'Home',
            recipientName:
              `${user.firstName || ''} ${
                user.lastName || ''
              }`.trim() || 'User',
            phone: user.phone || '',

            addressLine1:
              addressDetails.addressLine1,

            area: addressDetails.area || undefined,

            city: addressDetails.city,

            province:
              addressDetails.province || undefined,

            postalCode:
              addressDetails.postalCode || undefined,

            country:
              addressDetails.country || 'Pakistan',

            latitude:
              selectedLocation.latitude,

            longitude:
              selectedLocation.longitude,

            isDefault: true,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          'Failed to save address',
        );
      }

      const savedAddress: UserAddress =
        await response.json();

      // Also save to localStorage for checkout pre-fill
      if (typeof window !== 'undefined') {
        localStorage.setItem('selected_location', JSON.stringify({
          address: addressDetails.addressLine1,
          area: addressDetails.area,
          city: addressDetails.city,
          lat: selectedLocation.latitude,
          lng: selectedLocation.longitude,
        }));
      }

      onAddressSaved(savedAddress);
    } catch (error) {
      console.error(
        'Failed to save address:',
        error,
      );

      setLocationError(
        'Unable to save this location. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/50">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="flex max-h-[calc(100vh-32px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Select Delivery Location
              </h2>

              <p className="mt-0.5 text-xs text-gray-500">
                Choose where you want your medicines
                delivered
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Search */}
          <div className="border-b border-gray-100 p-4">
            <div className="relative">
              <input
                type="text"
                value={searchText}
                onChange={(event) =>
                  setSearchText(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSearch();
                  }
                }}
                placeholder="Search area, city or address"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 pr-24 text-sm text-gray-800 outline-none focus:border-[#ff6f61] focus:bg-white"
              />

              <button
                type="button"
                onClick={handleSearch}
                disabled={loadingAddress}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-[#ff574d] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#e8453b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Search
              </button>
            </div>
          </div>

          {/* Map */}
          <div className="relative h-[380px] w-full">
            <MapContainer
              center={[
                selectedLocation.latitude,
                selectedLocation.longitude,
              ]}
              zoom={15}
              scrollWheelZoom
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapController
                location={selectedLocation}
              />

              <MapClickHandler
                onLocationChange={
                  handleMapLocationChange
                }
              />

              <Marker
                position={[
                  selectedLocation.latitude,
                  selectedLocation.longitude,
                ]}
                icon={markerIcon}
              />
            </MapContainer>

            {/* Current location */}
            <button
              type="button"
              onClick={handleCurrentLocation}
              disabled={loadingLocation}
              className="absolute bottom-4 left-1/2 z-[500] -translate-x-1/2 rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-gray-800 shadow-lg hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingLocation
                ? 'Detecting location...'
                : '📍 Use My Current Location'}
            </button>
          </div>

          {/* Selected address */}
          <div className="border-t border-gray-100 px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
              Selected Location
            </p>

            {loadingAddress ? (
              <div className="mt-2 text-sm text-gray-500">
                Detecting address...
              </div>
            ) : addressDetails ? (
              <div className="mt-1">
                <p className="text-sm font-semibold text-gray-900">
                  {addressDetails.area ||
                    addressDetails.city}
                  {addressDetails.city &&
                  addressDetails.area
                    ? `, ${addressDetails.city}`
                    : ''}
                </p>

                <p className="mt-0.5 text-xs text-gray-500">
                  {addressDetails.addressLine1}
                </p>

                {addressDetails.province && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    {addressDetails.province}
                    {addressDetails.postalCode
                      ? ` - ${addressDetails.postalCode}`
                      : ''}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-1 text-sm text-gray-500">
                Select a point on the map or use your
                current location.
              </p>
            )}

            {locationError && (
              <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                {locationError}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-5 py-4">
            <div className="text-[10px] text-gray-400">
              Map data © OpenStreetMap contributors
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={
                saving ||
                loadingAddress ||
                !addressDetails?.city
              }
              className="rounded-lg bg-[#ff574d] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#e8453b] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? 'Saving...'
                : 'Confirm Location'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
