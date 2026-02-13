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

export default function Map({ locations, selectedUser, source, destination, onDirectionsUpdate }) {
  const mapRef = useRef(null);
  const liveMarkers = useRef({});
  const pulseMarkers = useRef({});
  const prevLocations = useRef({});
  const sourceMarker = useRef(null);
  const destMarker = useRef(null);
  const directionsRenderer = useRef(null);

  useEffect(() => {
    if (!window.google) return;

    mapRef.current = new google.maps.Map(document.getElementById("map"), {
      zoom: 16,
      center: { lat: 28.6139, lng: 77.209 },
      tilt: 45,
      mapId: "DEMO_MAP_ID",
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#242424" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#747474" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242424" }] },
        { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#333333" }] },
        { featureType: "landscape.man_made", elementType: "geometry.fill", stylers: [{ color: "#2a2a2a" }] },
        { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#383838" }] },
        { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#959595" }] },
        { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#454545" }] },
        { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#666666" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#1a1a1a" }] }
      ]
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
  }, []);

  useEffect(() => {
    const updateMarkers = async () => {
      if (!mapRef.current) return;
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
            const icon = pm.getIcon();
            pm.setIcon({ ...icon, scale: pulseScale, fillOpacity: 0.5 - (pulseScale - 15) / 20 });
            requestAnimationFrame(animatePulse);
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

          // Smooth Interpolation
          let start = null;
          const duration = 1000;
          const animateMove = (timestamp) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            const lat = prevPos.lat + (currentPos.lat - prevPos.lat) * progress;
            const lng = prevPos.lng + (currentPos.lng - prevPos.lng) * progress;
            const pos = { lat, lng };

            marker.position = pos;
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

  // Directions
  useEffect(() => {
    if (selectedUser && mapRef.current) {
      const directionsService = new google.maps.DirectionsService();
      if (selectedUser.source && selectedUser.destination) {
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
      }
    }
  }, [selectedUser]);

  // Source/Dest
  useEffect(() => {
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

  return <div id="map" className="h-full w-full bg-[#0e1626]" />;
}
