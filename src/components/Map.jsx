import { useEffect, useRef } from "react";

// High-Fidelity Realistic Sedan SVG as a React Component string
const CAR_SVG_HTML = `
<div class="car-container" style="width: 40px; height: 80px; position: relative; transition: transform 0.1s linear;">
  <svg width="40" height="80" viewBox="0 0 40 80" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.3));">
    <!-- Body -->
    <rect x="4" y="2" width="32" height="76" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
    <!-- Hood Decor -->
    <path d="M8 22 Q20 20 32 22" fill="none" stroke="#e2e8f0" stroke-width="1"/>
    <!-- Windshield -->
    <path d="M7 32 C7 26 33 26 33 32 L30 46 L10 46 Z" fill="#1e293b"/>
    <!-- Roof Section -->
    <rect x="8" y="48" width="24" height="15" rx="3" fill="#ffffff" stroke="#f1f5f9" stroke-width="0.5"/>
    <!-- Rear Window -->
    <path d="M10 65 L30 65 L33 74 C33 78 7 78 7 74 Z" fill="#1e293b"/>
    <!-- Headlights -->
    <rect x="7" y="4" width="8" height="3" rx="1.5" fill="#fef08a" opacity="0.9"/>
    <rect x="25" y="4" width="8" height="3" rx="1.5" fill="#fef08a" opacity="0.9"/>
    <!-- Brakelights -->
    <rect x="8" y="75" width="6" height="2" rx="1" fill="#ef4444"/>
    <rect x="26" y="75" width="6" height="2" rx="1" fill="#ef4444"/>
  </svg>
</div>
`;

const getBearing = (from, to) => {
  if (!from || !to) return 0;
  const lat1 = (from.lat * Math.PI) / 180;
  const lng1 = (from.lng * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const lng2 = (to.lng * Math.PI) / 180;
  const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
};

export default function Map({ locations, selectedUser, source, destination, onDirectionsUpdate, passengerPos, recenterFlag, historyPath, showRoutePreview }) {
  const mapContainerRef = useRef(null); // Ref for the DIV
  const mapRef = useRef(null); // Ref for Google Map Instance
  const liveMarkers = useRef({});
  const pulseMarkers = useRef({});
  const passengerMarker = useRef(null);
  const prevLocations = useRef({});
  const sourceMarker = useRef(null);
  const destMarker = useRef(null);
  const directionsRenderer = useRef(null);
  const historyPolyline = useRef(null);
  const previewDirectionsRenderer = useRef(null); // Separate renderer for modal preview

  useEffect(() => {
    const initMap = () => {
      if (!window.google || !window.google.maps) return false;
      if (!mapContainerRef.current) return false;
      if (mapRef.current) return true;

      try {
        mapRef.current = new google.maps.Map(mapContainerRef.current, {
          mapId: "DEMO_MAP_ID", // Google's demo Map ID for testing
          zoom: 16,
          center: { lat: 28.6139, lng: 77.209 },
          tilt: 45,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false
        });

        directionsRenderer.current = new google.maps.DirectionsRenderer({
          map: mapRef.current,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: "#60a5fa",
            strokeWeight: 6,
            strokeOpacity: 0.6
          }
        });

        previewDirectionsRenderer.current = new google.maps.DirectionsRenderer({
          map: null, // Initially not attached
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: "#60a5fa", // Blue line for route preview
            strokeWeight: 5,
            strokeOpacity: 0.8
          }
        });

        return true;
      } catch (error) {
        console.error("Map initialization error:", error);
        return false;
      }
    };

    if (!initMap()) {
      const intervalId = setInterval(() => {
        if (initMap()) {
          clearInterval(intervalId);
        }
      }, 100);
    }
  }, []);

  // History Path Renderer
  useEffect(() => {
    if (!mapRef.current) return;

    if (historyPath && historyPath.length > 0) {
      if (!historyPolyline.current) {
        historyPolyline.current = new google.maps.Polyline({
          path: historyPath,
          geodesic: true,
          strokeColor: "#f59e0b", // Amber/Orange for history
          strokeOpacity: 0.8,
          strokeWeight: 4,
          icons: [{
            icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
            offset: "100%",
            repeat: "50px"
          }],
          map: mapRef.current
        });
      } else {
        historyPolyline.current.setPath(historyPath);
        historyPolyline.current.setMap(mapRef.current);
      }

      // Fit bounds to history
      const bounds = new google.maps.LatLngBounds();
      historyPath.forEach(pt => bounds.extend(pt));
      mapRef.current.fitBounds(bounds);

    } else {
      if (historyPolyline.current) {
        historyPolyline.current.setMap(null);
      }
    }
  }, [historyPath]);

  // Effect to handle live marker updates 
  useEffect(() => {
    const updateMarkers = async () => {
      if (!mapRef.current || !window.google) return;

      // Dynamic import inside effect to ensure library is loaded
      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

      Object.entries(locations).forEach(([token, currentPos]) => {
        const prevPos = prevLocations.current[token] || currentPos;
        const bearing = getBearing(prevPos, currentPos);

        if (!liveMarkers.current[token]) {
          // Pulse Effect
          pulseMarkers.current[token] = new google.maps.Marker({
            map: mapRef.current,
            position: currentPos,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 15,
              fillColor: "#3b82f6",
              fillOpacity: 0.4,
              strokeWeight: 0,
            },
            clickable: false,
            zIndex: 1
          });

          // Animation for Pulse
          let pulseDir = 1, pulseScale = 15;
          const animatePulse = () => {
            if (!pulseMarkers.current[token]) return;
            pulseScale += 0.3 * pulseDir;
            if (pulseScale > 22) pulseDir = -1;
            if (pulseScale < 15) pulseDir = 1;
            const pm = pulseMarkers.current[token];
            // Check if marker still exists/is valid
            if (pm.getMap()) {
              const icon = pm.getIcon();
              pm.setIcon({ ...icon, scale: pulseScale, fillOpacity: 0.5 - (pulseScale - 15) / 20 });
              requestAnimationFrame(animatePulse);
            }
          };
          requestAnimationFrame(animatePulse);

          // Advanced Marker
          const carContent = document.createElement("div");
          carContent.innerHTML = CAR_SVG_HTML;
          const carWrapper = carContent.querySelector(".car-container");
          carWrapper.style.transform = `rotate(${bearing}deg)`;

          liveMarkers.current[token] = new AdvancedMarkerElement({
            map: mapRef.current,
            position: currentPos,
            content: carContent,
            zIndex: 10
          });

          mapRef.current.panTo(currentPos);
          mapRef.current.setZoom(18);
        } else {
          const marker = liveMarkers.current[token];
          const pulse = pulseMarkers.current[token];
          const carWrapper = marker.content.querySelector(".car-container");

          if (!marker.map) marker.map = mapRef.current; // Re-attach if lost

          // Smooth Interpolation
          let start = null;
          const duration = 1000;
          const animateMove = (timestamp) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            const lat = prevPos.lat + (currentPos.lat - prevPos.lat) * progress;
            const lng = prevPos.lng + (currentPos.lng - prevPos.lng) * progress;
            const pos = { lat, lng };

            if (marker) marker.position = pos;
            if (pulse) pulse.setPosition(pos);

            if (progress === 0 && carWrapper) {
              carWrapper.style.transform = `rotate(${bearing}deg)`;
            }

            if (progress < 1) requestAnimationFrame(animateMove);
          };
          requestAnimationFrame(animateMove);
        }
        prevLocations.current[token] = currentPos;
      });
    };

    updateMarkers();
  }, [locations]);

  // Directions for selected user (live tracking)
  useEffect(() => {
    if (!directionsRenderer.current || !mapRef.current) return;

    if (selectedUser && selectedUser.source && selectedUser.destination) {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: selectedUser.source,
          destination: selectedUser.destination,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            directionsRenderer.current.setDirections(result);
            if (onDirectionsUpdate) {
              const leg = result.routes[0].legs[0];
              onDirectionsUpdate({ distance: leg.distance.text, duration: leg.duration.text });
            }
          }
        }
      );
    } else {
      // Clear directions when no user is selected
      directionsRenderer.current.setDirections({ routes: [] });
    }
  }, [selectedUser]);

  // Route Preview for Modal (when creating new journey)
  useEffect(() => {
    if (!previewDirectionsRenderer.current || !mapRef.current || !showRoutePreview) return;

    if (source && destination) {
      // Both source and destination available - show route with blue line
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: source,
          destination: destination,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            previewDirectionsRenderer.current.setMap(mapRef.current);
            previewDirectionsRenderer.current.setDirections(result);

            // Fit bounds to show entire route
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(source);
            bounds.extend(destination);
            mapRef.current.fitBounds(bounds);
          }
        }
      );
    } else if (source) {
      // Only source available - center map on pickup location
      previewDirectionsRenderer.current.setDirections({ routes: [] });
      mapRef.current.panTo(source);
      mapRef.current.setZoom(15);
    } else {
      // No locations - clear preview
      previewDirectionsRenderer.current.setDirections({ routes: [] });
    }
  }, [source, destination, showRoutePreview]);

  // Source/Dest
  useEffect(() => {
    if (!mapRef.current) return;

    const createMarker = (pos, color, label) => new google.maps.Marker({
      map: mapRef.current,
      position: pos,
      label: { text: label, color: "white", fontWeight: "bold", fontSize: "10px" },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: color,
        fillOpacity: 1,
        strokeWeight: 3,
        strokeColor: "white"
      },
      zIndex: 5
    });

    if (source) {
      if (!sourceMarker.current) sourceMarker.current = createMarker(source, "#3b82f6", "S");
      else sourceMarker.current.setPosition(source);
    }
    if (destination) {
      if (!destMarker.current) destMarker.current = createMarker(destination, "#10b981", "D");
      else destMarker.current.setPosition(destination);
    }
  }, [source, destination]);

  // Passenger's Own Location Marker
  useEffect(() => {
    if (passengerPos && mapRef.current) {
      if (!passengerMarker.current) {
        passengerMarker.current = new google.maps.Marker({
          map: mapRef.current,
          position: passengerPos,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#3b82f6",
            fillOpacity: 1,
            strokeWeight: 4,
            strokeColor: "#ffffff",
          },
          title: "My Location",
          zIndex: 20
        });
      } else {
        passengerMarker.current.setPosition(passengerPos);
      }
    }
  }, [passengerPos]);

  // Recenter Logic
  useEffect(() => {
    if (recenterFlag > 0 && mapRef.current) {
      // Find the first active driver location to recenter on
      const driverTokens = Object.keys(locations);
      if (driverTokens.length > 0) {
        mapRef.current.panTo(locations[driverTokens[0]]);
        mapRef.current.setZoom(18);
      } else if (passengerPos) {
        mapRef.current.panTo(passengerPos);
        mapRef.current.setZoom(18);
      }
    }
  }, [recenterFlag]);

  return <div ref={mapContainerRef} className="absolute inset-0 w-full h-full bg-[#0e1626]" />;
}
