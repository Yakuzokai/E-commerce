import { useState, useEffect, useRef } from 'react';
import { MapPin, Plus, ArrowLeft, Trash2, Home, Briefcase, Map as MapIcon, Loader2, X, Navigation, Crosshair } from 'lucide-react';
import { Link } from 'react-router-dom';
import { userApi, Address, CreateAddressRequest } from '@/lib/api';
import { useAuthStore } from '@/stores';

const FALLBACK_COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Australia'];

export default function AddressesPage() {
  const { user } = useAuthStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [countries, setCountries] = useState<string[]>(FALLBACK_COUNTRIES);
  const [isLoading, setIsLoading] = useState(true);
  const [isCountriesLoading, setIsCountriesLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map state
  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.006 });
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Form State
  const [formData, setFormData] = useState<CreateAddressRequest>({
    type: 'home',
    label: 'Home',
    recipientName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
    isDefault: false
  });

  useEffect(() => {
    if (user?.id) {
      fetchAddresses();
    }
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;

    const loadCountries = async () => {
      try {
        setIsCountriesLoading(true);
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name');
        if (!response.ok) {
          throw new Error(`RestCountries request failed with status ${response.status}`);
        }

        const data = (await response.json()) as Array<{ name?: { common?: string } }>;
        const normalizedCountries = data
          .map((country) => country.name?.common?.trim() || '')
          .filter((countryName) => countryName.length > 0)
          .sort((a, b) => a.localeCompare(b));

        if (isMounted && normalizedCountries.length > 0) {
          setCountries(normalizedCountries);
        }
      } catch (fetchError) {
        console.warn('Failed to load countries from RestCountries API. Falling back to defaults.', fetchError);
        if (isMounted) {
          setCountries(FALLBACK_COUNTRIES);
        }
      } finally {
        if (isMounted) {
          setIsCountriesLoading(false);
        }
      }
    };

    void loadCountries();

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchAddresses = async () => {
    try {
      setIsLoading(true);
      const data = await userApi.getAddresses(user!.id);
      setAddresses(data);
    } catch (err) {
      console.error('Failed to fetch addresses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));

    if (name === 'type') {
      const labels: Record<string, string> = { home: 'Home', work: 'Work', other: 'Other' };
      setFormData(prev => ({ ...prev, label: labels[value as string] || value as string }));
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Reverse geocoding failed:', err);
      return null;
    }
  };

  const searchAddress = async () => {
    const searchQuery = `${formData.addressLine1}, ${formData.city}, ${formData.state}, ${formData.country}`.trim();
    if (!searchQuery) return;

    setIsMapLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setMapCenter({ lat: parseFloat(lat), lng: parseFloat(lon) });
        setSelectedLocation({ lat: parseFloat(lat), lng: parseFloat(lon) });

        // Parse and auto-fill form
        const addr = data[0].address || {};
        setFormData(prev => ({
          ...prev,
          addressLine1: display_name?.split(',')[0] || prev.addressLine1,
          city: addr.city || addr.town || addr.village || prev.city,
          state: addr.state || prev.state,
          postalCode: addr.postcode || prev.postalCode
        }));

        setShowMap(true);
      } else {
        alert('Location not found. Try a different search term.');
      }
    } catch (err) {
      console.error('Location search failed:', err);
    }
    setIsMapLoading(false);
  };

  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsMapLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter({ lat: latitude, lng: longitude });
        setSelectedLocation({ lat: latitude, lng: longitude });
        setShowMap(true);
        setIsMapLoading(false);
      },
      () => {
        alert('Unable to retrieve your location');
        setIsMapLoading(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await userApi.addAddress(user.id, formData);
      await fetchAddresses();
      setIsModalOpen(false);
      setShowMap(false);
      setSelectedLocation(null);
      setFormData({
        type: 'home',
        label: 'Home',
        recipientName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        phone: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'United States',
        isDefault: false
      });
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to save address. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!user?.id || !window.confirm('Are you sure you want to delete this address?')) return;

    try {
      await userApi.deleteAddress(user.id, addressId);
      setAddresses((prev) => prev.filter((address) => address.id !== addressId));
      await fetchAddresses();
    } catch (err) {
      alert('Failed to delete address');
    }
  };

  const handleSetDefault = async (addressId: string) => {
    if (!user?.id) return;
    try {
      await userApi.setDefaultAddress(user.id, addressId);
      await fetchAddresses();
    } catch (err) {
      alert('Failed to set default address');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
      <Link to="/account" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary-600 mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Account
      </Link>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Addresses</h1>
        {addresses.length > 0 && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-primary-700 transition-all"
          >
            <Plus className="w-4 h-4" /> Add New
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-gray-200 text-center">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-6">You haven't saved any addresses yet.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" /> Add New Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((address) => (
            <div key={address.id} className={`bg-white p-6 rounded-2xl border-2 transition-all ${address.isDefault ? 'border-primary-500 shadow-lg shadow-primary-50' : 'border-gray-100 hover:border-gray-200'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${address.isDefault ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {address.type === 'home' ? <Home className="w-4 h-4" /> : address.type === 'work' ? <Briefcase className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{address.label}</h3>
                    {address.isDefault && <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Default Address</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(address.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-gray-600 text-sm mb-6">
                <p className="font-bold text-gray-900">{address.recipientName}</p>
                <p>{address.addressLine1}</p>
                {address.addressLine2 && <p>{address.addressLine2}</p>}
                <p>{address.city}, {address.state} {address.postalCode}</p>
                <p>{address.country}</p>
                <p className="pt-2 flex items-center gap-2">
                  <span className="text-gray-400 italic">Phone:</span> {address.phone}
                </p>
              </div>

              {!address.isDefault && (
                <button
                  onClick={() => handleSetDefault(address.id)}
                  className="w-full py-2 text-primary-600 font-bold text-xs border border-primary-100 rounded-lg hover:bg-primary-50 transition-all"
                >
                  Set as Default
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Address Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b shrink-0">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-500" />
                Add New Address
              </h2>
              <button onClick={() => { setIsModalOpen(false); setShowMap(false); setSelectedLocation(null); }} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Address Type</label>
                  <div className="flex gap-2">
                    {['home', 'work', 'other'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleInputChange({ target: { name: 'type', value: t } } as any)}
                        className={`flex-1 py-2 rounded-xl border-2 font-bold capitalize transition-all ${formData.type === t ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Recipient Name</label>
                  <input type="text" name="recipientName" required value={formData.recipientName} onChange={handleInputChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Full Name" />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Phone Number</label>
                  <input type="tel" name="phone" required value={formData.phone} onChange={handleInputChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="+1 (555) 000-0000" />
                </div>

                {/* Address Line 1 with Pin Button */}
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase">Address Line 1</label>
                    <button
                      type="button"
                      onClick={() => setShowMap(!showMap)}
                      className="text-xs text-primary-600 font-bold flex items-center gap-1 hover:text-primary-700"
                    >
                      <MapPin className="w-3 h-3" /> {showMap ? 'Hide Map' : 'Pin on Map'}
                    </button>
                  </div>
                  <input type="text" name="addressLine1" required value={formData.addressLine1} onChange={handleInputChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Street address, P.O. box" />
                </div>

                {/* Interactive Map */}
                {showMap && (
                  <div className="col-span-2">
                    <div className="mb-2 flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={detectCurrentLocation}
                        disabled={isMapLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-600 text-xs font-bold rounded-lg hover:bg-primary-100 transition-all disabled:opacity-50"
                      >
                        <Crosshair className="w-3 h-3" /> My Location
                      </button>
                      <button
                        type="button"
                        onClick={searchAddress}
                        disabled={isMapLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50"
                      >
                        <Navigation className="w-3 h-3" /> Search
                      </button>
                      {isMapLoading && <span className="text-xs text-gray-400">Loading...</span>}
                    </div>

                    {/* OpenStreetMap Embed */}
                    <div
                      ref={mapContainerRef}
                      className="relative w-full h-56 bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-200"
                    >
                      <iframe
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter.lng - 0.05},${mapCenter.lat - 0.03},${mapCenter.lng + 0.05},${mapCenter.lat + 0.03}&layer=mapnik&marker=${selectedLocation?.lat || mapCenter.lat},${selectedLocation?.lng || mapCenter.lng}`}
                        className="w-full h-full"
                        style={{ border: 0 }}
                        title="Location Picker"
                      />

                      {/* Pin Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative">
                          <div className="absolute -top-1 -left-1 w-8 h-8 bg-primary-600/20 rounded-full animate-ping" />
                          <MapPin className="w-10 h-10 text-primary-600 drop-shadow-lg relative z-10" />
                        </div>
                      </div>

                      <p className="absolute bottom-2 left-2 bg-white/90 px-3 py-1 rounded-lg text-xs text-gray-600 shadow">
                        Click on map or use buttons to locate
                      </p>
                    </div>

                    {selectedLocation && (
                      <p className="mt-2 text-xs text-green-600 font-medium">
                        Location pinned: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                      </p>
                    )}
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Address Line 2 (Optional)</label>
                  <input type="text" name="addressLine2" value={formData.addressLine2} onChange={handleInputChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Apartment, suite, unit, building, floor, etc." />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">City</label>
                  <input type="text" name="city" required value={formData.city} onChange={handleInputChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="City" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">State / Province</label>
                  <input type="text" name="state" required value={formData.state} onChange={handleInputChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="State" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">ZIP / Postal Code</label>
                  <input type="text" name="postalCode" required value={formData.postalCode} onChange={handleInputChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="ZIP" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Country</label>
                  <select name="country" value={formData.country} onChange={handleInputChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500">
                    {countries.map((countryName) => (
                      <option key={countryName} value={countryName}>
                        {countryName}
                      </option>
                    ))}
                  </select>
                  {isCountriesLoading && (
                    <p className="mt-1 text-[10px] text-gray-400 uppercase tracking-wide">Loading countries...</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 mb-8">
                <input
                  type="checkbox"
                  id="isDefault"
                  name="isDefault"
                  checked={formData.isDefault}
                  onChange={handleInputChange}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="isDefault" className="text-sm font-medium text-gray-700">Set as default address</label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-primary-600 text-white font-bold rounded-2xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Save Address
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}