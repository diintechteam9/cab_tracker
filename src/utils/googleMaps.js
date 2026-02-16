// This file dynamically loads Google Maps API with the key from environment variables
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export const loadGoogleMapsScript = () => {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.google && window.google.maps) {
            resolve();
            return;
        }

        // Create script element
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,marker&v=weekly&loading=async`;
        script.async = true;
        script.defer = true;

        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Maps'));

        document.head.appendChild(script);
    });
};
