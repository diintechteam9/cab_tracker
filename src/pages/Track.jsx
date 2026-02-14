import { useEffect, useState, useRef } from "react";
import { socket } from "../api/socket";
import Map from "../components/Map";

export default function Track() {
  const [role, setRole] = useState(null); // 'driver' or 'passenger'
  const [tracking, setTracking] = useState(false);
  const [status, setStatus] = useState("Initializing...");
  const [pos, setPos] = useState(null);
  const [passengerPos, setPassengerPos] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [userData, setUserData] = useState(null);
  const [recenterFlag, setRecenterFlag] = useState(0);
  const [distanceInfo, setDistanceInfo] = useState({ distance: "...", duration: "..." });
  const watchIdRef = useRef(null);
  const passengerWatchIdRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const urlRole = params.get("role") || "passenger";

    console.log("🔍 Track.jsx Debug:", { urlRole, token });
    setRole(urlRole);

    if (token) {
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/users`)
        .then(res => res.json())
        .then(users => {
          const user = users.find(u => u.token === token);
          console.log("👤 User Data Found:", user);
          setUserData(user || null);

          if (urlRole === "passenger" && user) {
            setStatus("Awaiting driver's live GPS...");
            startPassengerMode(token);
          } else {
            console.log("✅ Driver mode - Ready to start");
            setStatus("Ready to start.");
          }
        });
    }

    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').catch(console.error);
    }

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      if (passengerWatchIdRef.current) navigator.geolocation.clearWatch(passengerWatchIdRef.current);
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

    // Track passenger's own location
    if (navigator.geolocation) {
      passengerWatchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setPassengerPos({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (err) => console.error("Passenger GPS error:", err),
        { enableHighAccuracy: true }
      );
    }
  };

  const handleRecenter = () => {
    setRecenterFlag(prev => prev + 1);
  };

  const handleDirectionsUpdate = (info) => {
    setDistanceInfo(info);
  };

  const startTracking = () => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setStatus("Error: No token found");
      return;
    }

    setStatus("Searching for GPS...");
    socket.connect();

    if (!navigator.geolocation) return;

    // 1. Get immediate first position and broadcast it
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const firstPos = {
          token,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speed: position.coords.speed || 0,
          gpsStatus: "ON"
        };
        socket.emit("send-location", firstPos);
        setPos({ lat: firstPos.lat, lng: firstPos.lng }); // Local update
      },
      (err) => console.error("Initial GPS error:", err),
      { enableHighAccuracy: true }
    );

    // 2. Start continuous watch
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

  // Reusable component for Journey Details (Sidebar/Bottom Sheet)
  const renderJourneyDetails = (isMobile = false) => (
    <div className={`flex-col h-full flex ${isMobile ? '' : 'bg-surface-light dark:bg-surface-dark'}`}>
      {/* Header Section */}
      <div className={`px-6 py-5 border-b border-gray-100 dark:border-white/5 ${isMobile ? '' : 'pt-8'}`}>
        {!isMobile && (
          <div className="mb-6 flex items-center gap-2 opacity-50">
            <span className="material-icons text-primary">gps_fixed</span>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">FleetOps Tracker</span>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/30 text-white">
                {role === 'driver' ? '👤' : '🚙'}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary border-4 border-surface-light dark:border-surface-dark rounded-full flex items-center justify-center">
                <span className="material-icons text-white text-[10px]">check</span>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                {role === 'driver' ? (userData?.name || "Passenger") : (userData?.driverName || "Driver Assigned")}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
                {role === 'driver' ? "Passenger Details" : (userData?.vehicleNumber || "Vehicle Pending")}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                  <span className="material-icons text-[10px]">star</span> 4.9
                </span>
                <span className="text-[10px] text-gray-400 font-medium">• {distanceInfo.distance || "0 km"} away</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <a
              href={`tel:${role === 'driver' ? userData?.mobile : userData?.driverMobile}`}
              className="w-12 h-12 rounded-full bg-primary text-surface-dark hover:bg-primary-dark transition-all flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95"
            >
              <span className="material-icons">call</span>
            </a>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 dark:bg-black/20 p-3 rounded-2xl border border-gray-100 dark:border-white/5 flex flex-col items-center justify-center transition-colors hover:bg-gray-100 dark:hover:bg-white/5">
            <span className="material-symbols-outlined text-primary mb-1 text-xl">speed</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">{speed}</span>
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Speed</span>
          </div>
          <div className="bg-gray-50 dark:bg-black/20 p-3 rounded-2xl border border-gray-100 dark:border-white/5 flex flex-col items-center justify-center transition-colors hover:bg-gray-100 dark:hover:bg-white/5">
            <span className="material-symbols-outlined text-blue-500 mb-1 text-xl">straighten</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">{distanceInfo.distance}</span>
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Dist</span>
          </div>
          <div className="bg-gray-50 dark:bg-black/20 p-3 rounded-2xl border border-gray-100 dark:border-white/5 flex flex-col items-center justify-center transition-colors hover:bg-gray-100 dark:hover:bg-white/5">
            <span className="material-symbols-outlined text-orange-500 mb-1 text-xl">schedule</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">{distanceInfo.duration}</span>
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">ETA</span>
          </div>
        </div>
      </div>

      {/* Timeline Section (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar scrollbar-hide">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 px-1">Journey Timeline</h3>

        <div className="relative space-y-8 pl-3">
          {/* Connector Line */}
          <div className="absolute left-[19px] top-3 bottom-4 w-0.5 bg-gradient-to-b from-gray-200 via-gray-200 to-transparent dark:from-white/10 dark:via-white/5"></div>

          {/* Current Status */}
          <div className="relative flex items-start gap-4 z-10">
            <div className="w-3.5 h-3.5 mt-1.5 rounded-full bg-primary border-[3px] border-surface-light dark:border-surface-dark shadow-[0_0_0_4px_rgba(43,238,140,0.2)]"></div>
            <div className="flex-1 bg-white dark:bg-neutral-dark p-3 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-primary font-bold uppercase mb-0.5">Current Status</p>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">{status}</h4>
                </div>
                <span className="text-[10px] font-mono text-gray-400">NOW</span>
              </div>
            </div>
          </div>

          {/* Pickup */}
          <div className="relative flex items-start gap-4 z-10 opacity-80">
            <div className="w-3.5 h-3.5 mt-1.5 rounded-full bg-white border-[3px] border-gray-300 dark:border-gray-600"></div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Pickup Location</h4>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{userData?.sourceAddress || "Loading..."}</p>
            </div>
          </div>

          {/* Destination */}
          <div className="relative flex items-start gap-4 z-10 opacity-60">
            <div className="w-3.5 h-3.5 mt-1.5 rounded-full bg-white border-2 border-gray-300 dark:border-gray-600"></div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Destination</h4>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{userData?.destAddress || "Loading..."}</p>
            </div>
          </div>
        </div>

        {/* Extra spacing for bottom scroll */}
        <div className="h-24"></div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-100 dark:bg-black font-sans overflow-hidden">

      {/* 1. DESKTOP SIDEBAR (Visible on LG+) */}
      <div className="hidden lg:flex w-96 flex-col h-full bg-surface-light dark:bg-surface-dark border-r border-gray-200 dark:border-white/10 z-30 shadow-2xl">
        {userData ? renderJourneyDetails(false) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Loading Dashboard...</p>
          </div>
        )}
      </div>

      {/* 2. MAIN MAP AREA (Responsive) */}
      <div className="w-full relative h-[55%] lg:h-full lg:flex-1 bg-neutral-200 dark:bg-neutral-800">
        {/* Map Component */}
        <div className="absolute inset-0 z-0">
          <Map
            locations={pos ? { [userData?.token]: pos } : {}}
            selectedUser={userData}
            source={userData?.source}
            destination={userData?.destination}
            passengerPos={passengerPos}
            recenterFlag={recenterFlag}
            onDirectionsUpdate={handleDirectionsUpdate}
          />
        </div>

        {/* Map Overlays (Gradient & Status) */}
        <div className="absolute top-0 left-0 right-0 h-28 z-10 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none"></div>

        {/* Header Controls (Mobile Style but used on Desktop map too for continuity) */}
        <div className="absolute top-4 left-0 right-0 px-5 z-20 flex justify-between items-center">
          <button className="w-10 h-10 rounded-full bg-white/90 dark:bg-black/40 backdrop-blur shadow-lg flex items-center justify-center text-gray-700 dark:text-white border border-white/20 transition-transform active:scale-95">
            <span className="material-icons">arrow_back</span>
          </button>

          <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/10 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${tracking ? 'bg-primary animate-pulse' : 'bg-red-500'}`}></span>
            <span className="text-sm font-bold text-white tracking-wide">
              {tracking ? "Live Tracking" : status}
            </span>
          </div>

          <button
            onClick={handleRecenter}
            className="w-10 h-10 rounded-full bg-white/90 dark:bg-black/40 backdrop-blur shadow-lg flex items-center justify-center text-gray-700 dark:text-white border border-white/20 transition-transform active:scale-95"
          >
            <span className="material-icons">my_location</span>
          </button>
        </div>

        {/* Speed Overlay (Floating) */}
        {tracking && (
          <div className="absolute bottom-24 lg:bottom-12 left-1/2 transform -translate-x-1/2 z-10">
            <div className="pulsating-circle absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10"></div>
            <div className="bg-surface-dark/90 backdrop-blur px-5 py-3 rounded-2xl border border-white/10 shadow-xl flex flex-col items-center min-w-[80px]">
              <span className="text-3xl font-bold text-white">{speed}</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1">km/h</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. MOBILE BOTTOM SHEET (Visible < LG) */}
      <div className="lg:hidden flex-1 -mt-10 bg-surface-light dark:bg-surface-dark rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.3)] relative z-20 flex flex-col overflow-hidden border-t border-white/10">
        {/* Drag Handle */}
        <div className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-neutral-600 rounded-full"></div>
        </div>

        {userData ? renderJourneyDetails(true) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Syncing Tracking Data...</p>
          </div>
        )}
      </div>

      {/* DRIVER MODAL OVERLAY */}
      {(() => {
        const shouldShow = role === 'driver' && !tracking && userData;
        return shouldShow;
      })() && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div className="w-full max-w-sm bg-surface-light dark:bg-surface-dark rounded-[2rem] p-6 shadow-2xl border border-white/10 animate-in slide-in-from-bottom-10 fade-in duration-300">
              <div className="flex justify-center -mt-16 mb-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-green-600 flex items-center justify-center text-4xl shadow-xl shadow-primary/30 rotate-3">
                  🚀
                </div>
              </div>

              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ready to Drive?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Start broadcasting your location</p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-100 dark:border-white/5 flex items-start gap-3">
                  <span className="text-lg">📍</span>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase">Pickup</h4>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{userData?.sourceAddress}</p>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-100 dark:border-white/5 flex items-start gap-3">
                  <span className="text-lg">🎯</span>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase">Drop-off</h4>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{userData?.destAddress}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={startTracking}
                className="w-full bg-primary hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/25 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>GO ONLINE</span>
                <span className="material-icons text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
