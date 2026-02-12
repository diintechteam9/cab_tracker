import { useEffect, useRef } from "react";

export default function Map({ locations, selectedUser, source, destination, onDirectionsUpdate }) {
  const mapRef = useRef(null);
  const liveMarkers = useRef({});
  const sourceMarker = useRef(null);
  const destMarker = useRef(null);
  const directionsRenderer = useRef(null);

  useEffect(() => {
    if (!window.google) {
      console.warn("Google Maps not loaded yet");
      return;
    }
    mapRef.current = new google.maps.Map(document.getElementById("map"), {
      zoom: 12,
      center: { lat: 28.6139, lng: 77.209 },
      styles: [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
      ],
    });

    directionsRenderer.current = new google.maps.DirectionsRenderer({
      map: mapRef.current,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#3b82f6",
        strokeWeight: 5,
        strokeOpacity: 0.8
      }
    });
  }, []);

  // Live moving user markers
  useEffect(() => {
    Object.entries(locations).forEach(([token, l]) => {
      if (!liveMarkers.current[token]) {
        liveMarkers.current[token] = new google.maps.Marker({
          map: mapRef.current,
          position: { lat: l.lat, lng: l.lng },
          title: "User",
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: "#3b82f6",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#ffffff",
            rotation: 0
          }
        });
      } else {
        liveMarkers.current[token].setPosition({ lat: l.lat, lng: l.lng });
      }
    });
  }, [locations]);

  // Directions & Smart Bounds
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
                onDirectionsUpdate({
                  distance: leg.distance.text,
                  duration: leg.duration.text
                });
              }

              // Smart Framing: Include route + current rider position
              const bounds = result.routes[0].bounds;
              const loc = locations[selectedUser.token];
              if (loc) {
                bounds.extend({ lat: loc.lat, lng: loc.lng });
              }

              mapRef.current.fitBounds(bounds, {
                top: 100, right: 100, bottom: 100, left: 350
              });
            }
          }
        );
      }
    } else if (!selectedUser && directionsRenderer.current) {
      directionsRenderer.current.setDirections({ routes: [] });
    }
  }, [selectedUser, locations]);

  // Source & Destination markers
  useEffect(() => {
    if (source) {
      if (!sourceMarker.current) {
        sourceMarker.current = new google.maps.Marker({
          map: mapRef.current,
          position: source,
          label: { text: "S", color: "white" },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#10b981",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "white"
          }
        });
      } else {
        sourceMarker.current.setPosition(source);
      }
    } else if (sourceMarker.current) {
      sourceMarker.current.setMap(null);
      sourceMarker.current = null;
    }

    if (destination) {
      if (!destMarker.current) {
        destMarker.current = new google.maps.Marker({
          map: mapRef.current,
          position: destination,
          label: { text: "D", color: "white" },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#ef4444",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "white"
          }
        });
      } else {
        destMarker.current.setPosition(destination);
      }
    } else if (destMarker.current) {
      destMarker.current.setMap(null);
      destMarker.current = null;
    }
  }, [source, destination]);

  return <div id="map" className="h-full w-full bg-gray-900" />;
}
