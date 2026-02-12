import { useEffect, useState, useRef } from "react";
import { socket } from "../api/socket";
import Map from "../components/Map";

export default function Track() {
  const [tracking, setTracking] = useState(false);
  const [status, setStatus] = useState("Ready to track");
  const [pos, setPos] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [userData, setUserData] = useState(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/users`)
        .then(res => res.json())
        .then(users => {
          const user = users.find(u => u.token === token);
          setUserData(user);
        });
    }

    // WakeLock to keep screen on if supported
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').catch(console.error);
    }
  }, []);

  const startTracking = () => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setStatus("Error: No token found");
      return;
    }

    setStatus("Searching for GPS...");
    socket.connect();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude: lat, longitude: lng, speed: s } = position.coords;
        const currentSpeed = s ? Math.round(s * 3.6) : 0; // Convert m/s to km/h

        setPos({ lat, lng });
        setSpeed(currentSpeed);
        setStatus("Tracking Active ✅");
        setTracking(true);

        socket.emit("send-location", {
          token,
          lat,
          lng,
          speed: currentSpeed,
          gpsStatus: "ON"
        });
      },
      (error) => {
        console.error(error);
        setStatus("GPS Error: " + error.message);
        socket.emit("send-location", { token, gpsStatus: "OFF" });
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white font-sans overflow-hidden">
      {/* HEADER */}
      <div className="p-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center shadow-lg z-10">
        <div>
          <h1 className="text-xl font-bold text-blue-400">Driver Mode</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest leading-none">
            {userData?.name || "Loading..."}
          </p>
        </div>
        {tracking && (
          <div className="flex flex-col items-end">
            <div className="text-2xl font-black text-emerald-400 leading-none">{speed}</div>
            <div className="text-[8px] text-gray-400 font-bold">KM/H</div>
          </div>
        )}
      </div>

      {/* MAP AREA */}
      <div className="flex-1 relative bg-gray-900">
        {tracking && userData ? (
          <Map
            locations={{ [userData.token]: pos || { lat: 0, lng: 0 } }}
            selectedUser={userData}
            source={userData.source}
            destination={userData.destination}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-10 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-blue-600/10 flex items-center justify-center animate-pulse">
              <span className="text-4xl">📍</span>
            </div>
            <div>
              <h2 className="text-lg font-bold">Aapka GPS Ready Hai</h2>
              <p className="text-sm text-gray-500 mt-2">Niche diye gaye button par click karein taaki admin aapko live track kar sakey.</p>
            </div>
          </div>
        )}

        {/* FLOATING STATUS */}
        {tracking && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-gray-900/95 backdrop-blur-md border border-gray-800 p-4 rounded-2xl shadow-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 animate-pulse">
              🛰️
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">System Status</div>
              <div className="text-sm font-bold text-emerald-400">{status}</div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 text-xs font-bold rounded-lg border border-red-900/50"
            >
              STOP
            </button>
          </div>
        )}
      </div>

      {/* START BUTTON OVERLAY */}
      {!tracking && (
        <div className="p-6 bg-gray-900 border-t border-gray-800">
          <button
            onClick={startTracking}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-2xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-3 text-lg"
          >
            🚀 START SHARING LOCATION
          </button>
          <p className="text-[10px] text-gray-600 text-center mt-4">
            * Tab ko piche chalne dein (minimize), lekin tab band na karein.
          </p>
        </div>
      )}
    </div>
  );
}
