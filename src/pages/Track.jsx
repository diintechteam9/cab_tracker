import { useEffect, useState, useRef } from "react";
import { socket } from "../api/socket";
import Map from "../components/Map";

export default function Track() {
  const [role, setRole] = useState(null); // 'driver' or 'passenger'
  const [tracking, setTracking] = useState(false);
  const [status, setStatus] = useState("Initializing...");
  const [pos, setPos] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [userData, setUserData] = useState(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const urlRole = params.get("role") || "passenger";
    setRole(urlRole);

    if (token) {
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/users`)
        .then(res => res.json())
        .then(users => {
          const user = users.find(u => u.token === token);
          setUserData(user || null);

          if (urlRole === "passenger" && user) {
            setStatus("Awaiting driver's live GPS...");
            startPassengerMode(token);
          } else {
            setStatus("Ready to start.");
          }
        });
    }

    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').catch(console.error);
    }

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      socket.disconnect();
    };
  }, []);

  const startPassengerMode = (token) => {
    setStatus("Connecting to live stream...");
    socket.connect();
    socket.emit("join-track", token);

    socket.on("location-update", (data) => {
      if (data.token === token) {
        setPos({ lat: data.lat, lng: data.lng });
        setSpeed(data.speed);
        setStatus("Live Tracking Active ✅");
        setTracking(true);
      }
    });
  };

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
        const currentSpeed = s ? Math.round(s * 3.6) : 0;

        setPos({ lat, lng });
        setSpeed(currentSpeed);
        setStatus("Sharing Location ✅");
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
        setStatus("GPS Error: " + error.message);
        socket.emit("send-location", { token, gpsStatus: "OFF" });
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white font-sans overflow-hidden">
      {/* HEADER */}
      <div className="p-4 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800 flex justify-between items-center shadow-lg z-20">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${role === 'driver' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
            {role === 'driver' ? 'D' : 'P'}
          </div>
          <h1 className="text-md font-bold truncate max-w-[150px]">
            {role === 'driver' ? 'Driver Console' : 'Safe Tracking'}
          </h1>
        </div>
        {tracking && (
          <div className="bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black text-emerald-400">LIVE: {speed} KM/H</span>
          </div>
        )}
      </div>

      {/* MAIN CONTENT AREA: SIDEBAR + MAP */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative bg-gray-950">
        {userData ? (
          <>
            {/* JOURNEY SIDEBAR (LEFT) - Covers full height on desktop */}
            <div className="hidden md:flex w-72 h-full flex-col bg-gray-900/30 backdrop-blur-3xl border-r border-white/5 p-8 shrink-0 z-10 transition-all duration-500">
              <div className="flex flex-col gap-10 relative h-full">
                <div className="pb-6 border-b border-white/5">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.3em] mb-3 opacity-50">Journey Roadmap</h3>
                  <div className="bg-indigo-500/10 inline-block px-2 py-1 rounded text-[9px] font-mono text-indigo-400 border border-indigo-500/20">
                    ID: {userData.token.slice(0, 8)}
                  </div>
                </div>

                <div className="flex flex-col gap-12 relative px-1">
                  <div className="absolute left-[11px] top-10 bottom-10 w-[2px] bg-gradient-to-b from-blue-500 via-gray-800 to-emerald-500 border-l border-dashed border-gray-700"></div>

                  <div className="flex gap-5 relative z-10 group">
                    <div className="w-6 h-6 rounded-full bg-blue-600 border-[3px] border-gray-950 shadow-[0_0_20px_rgba(37,99,235,0.4)] flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform"></div>
                    <div>
                      <div className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em] mb-2 opacity-70">Pickup Point</div>
                      <div className="text-sm font-semibold text-gray-100 leading-snug">
                        {userData.sourceAddress || "Location pending..."}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-5 relative z-10 group">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 border-[3px] border-gray-950 shadow-[0_0_20px_rgba(16,185,129,0.4)] flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform"></div>
                    <div>
                      <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.2em] mb-2 opacity-70">Drop-off Point</div>
                      <div className="text-sm font-semibold text-gray-100 leading-snug">
                        {userData.destAddress || "Destination pending..."}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto py-8 text-center border-t border-white/5">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]"></div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Signal Locked</span>
                  </div>
                </div>
              </div>
            </div>

            {/* MAP SECTION - Takes remaining space */}
            <div className="flex-1 h-full relative bg-gray-900 overflow-hidden">
              <Map
                locations={pos ? { [userData.token]: pos } : {}}
                selectedUser={userData}
                source={userData.source}
                destination={userData.destination}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] animate-pulse">Synchronizing Data...</p>
          </div>
        )}

        {/* DRIVER START OVERLAY */}
        {role === 'driver' && !tracking && userData && (
          <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl shadow-2xl text-center w-full max-w-xs space-y-6">
              <div className="text-4xl">🚀</div>
              <h2 className="text-xl font-black">Ready to Start?</h2>
              <button
                onClick={startTracking}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all text-sm"
              >
                GO ONLINE
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM DETAILS SECTION (Flat & Compact) */}
      {userData && (
        <div className="p-3 md:p-4 bg-gray-900/40 backdrop-blur-3xl border-t border-white/5 rounded-tr-none shadow-[0_-20px_50px_rgba(0,0,0,0.7)] z-20 ring-1 ring-white/10 relative">
          <div className="absolute top-0 left-0 w-72 h-[1px] bg-gray-900/40 -translate-y-full md:block hidden"></div>

          <div className="flex items-center justify-between gap-4 mt-1">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-indigo-600/10 flex items-center justify-center text-xl shadow-inner border border-white/5">
                {role === 'driver' ? '👤' : '👨‍✈️'}
              </div>
              <div className="min-w-0">
                <div className="text-[8px] text-gray-500 font-bold uppercase tracking-[0.2em] mb-0.5 opacity-50">
                  {role === 'driver' ? 'Passenger Details' : 'Driver & Vehicle'}
                </div>
                <div className="text-sm md:text-base font-black text-white flex items-center gap-2 truncate">
                  {role === 'driver' ? (userData?.name || "Passenger") : (userData?.driverName || "Driver Not Assigned")}
                </div>
                <div className="text-[10px] text-indigo-400 font-bold truncate">
                  {role === 'driver' ? (userData?.mobile || "No Number") : `${userData?.driverMobile || "No Number"} • ${userData?.vehicleNumber || "No Vehicle"}`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden lg:flex items-center gap-3 px-3 h-10 bg-white/5 rounded-lg border border-white/5">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${tracking ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{status}</span>
                </div>
                <div className="w-px h-3 bg-white/10"></div>
                <div className="text-[9px] font-mono text-indigo-300 opacity-60">#{userData?.token?.slice(0, 8)}</div>
              </div>

              <a
                href={`tel:${role === 'driver' ? userData?.mobile : userData?.driverMobile}`}
                className="px-4 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 flex items-center justify-center gap-2 rounded-lg shadow-lg shadow-emerald-500/10 active:scale-95 transition-all text-white font-black text-[10px] uppercase tracking-wider"
              >
                Call {role === 'driver' ? 'Passenger' : 'Driver'}
              </a>
            </div>
          </div>

          <div className="flex lg:hidden items-center justify-between mt-3 pt-3 border-t border-white/5">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${tracking ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{status}</span>
            </div>
            <div className="text-[8px] font-mono text-gray-600">ID: {userData?.token?.slice(0, 12)}...</div>
          </div>
        </div>
      )}
    </div>
  );
}
