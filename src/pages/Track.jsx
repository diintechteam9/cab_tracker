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

  return (
    <div className="flex flex-col h-screen bg-fleet-bg text-slate-800 font-sans overflow-hidden">
      {/* HEADER - Clean & White */}
      <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-30 shadow-sm transition-all">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs md:text-sm text-white ${role === 'driver' ? 'bg-indigo-600' : 'bg-brand-mint'}`}>
            {role === 'driver' ? 'D' : 'P'}
          </div>
          <h1 className="text-base font-black text-slate-900 tracking-tight">
            {role === 'driver' ? 'Driver Console' : 'Safe Tracking'}
          </h1>
        </div>

        {tracking && (
          <div className="bg-brand-mint/10 px-4 py-1.5 rounded-xl border border-brand-mint/20 flex items-center gap-2">
            <div className="w-2 h-2 bg-brand-mint rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
            <span className="text-[10px] font-black text-brand-mint uppercase tracking-widest">{speed} KM/H LIVE</span>
          </div>
        )}
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden">
        {userData ? (
          <>
            {/* JOURNEY SIDEBAR (LEFT) - Fleet Card Style */}
            <div className="hidden lg:flex w-80 h-full flex-col p-6 shrink-0 z-10 bg-fleet-bg overflow-y-auto pr-2">
              <div className="bg-white rounded-[2rem] p-6 border border-gray-200 shadow-xl flex flex-col gap-8 h-full">
                <div className="pb-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Journey Board</h3>
                    <div className="text-sm font-black text-slate-900 mt-1">Ready to pickup</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-brand-mint leading-none">{distanceInfo.distance}</div>
                    <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">{distanceInfo.duration}</div>
                  </div>
                </div>

                <div className="flex-1 space-y-10 relative">
                  {/* Vertical Dotted Line */}
                  <div className="absolute left-[11px] top-6 bottom-6 w-[1.5px] border-l-2 border-dotted border-slate-200"></div>

                  <div className="flex gap-5 relative z-10">
                    <div className="w-6 h-6 rounded-full border-[3px] border-white bg-white shadow-xl flex-shrink-0 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-500"></div>
                    </div>
                    <div>
                      <div className="text-[8px] text-blue-500 font-black uppercase tracking-widest mb-1.5 opacity-60">Source Pickup</div>
                      <div className="text-xs font-bold text-slate-800 leading-snug pr-4">
                        {userData.sourceAddress || "Search for location..."}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-5 relative z-10">
                    <div className="w-6 h-6 rounded-full border-[3px] border-white bg-brand-mint shadow-[0_8px_20px_rgba(34,197,94,0.3)] flex-shrink-0"></div>
                    <div>
                      <div className="text-[8px] text-brand-mint font-black uppercase tracking-widest mb-1.5 opacity-60">Drop-off Destination</div>
                      <div className="text-xs font-bold text-slate-800 leading-snug pr-4">
                        {userData.destAddress || "Destination pending..."}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-[10px] font-black text-slate-300 uppercase letter-spacing-[0.1em]">Trip ID: {userData.token.slice(-6)}</div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-mint animate-pulse"></span>
                    <span className="text-[9px] font-black text-slate-400 uppercase">Secure Connection</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: Map (Top) & Bottom Details (Bottom) */}
            <div className="flex-1 flex flex-col h-full relative overflow-hidden">
              {/* MAP SECTION */}
              <div className="flex-1 min-h-0 relative bg-gray-900 h-full">
                <Map
                  locations={pos ? { [userData.token]: pos } : {}}
                  selectedUser={userData}
                  source={userData.source}
                  destination={userData.destination}
                  passengerPos={passengerPos}
                  recenterFlag={recenterFlag}
                  onDirectionsUpdate={handleDirectionsUpdate}
                />

                {/* FLOATING ACTION BUTTONS */}
                <div className="absolute top-4 right-4 flex flex-col gap-3 z-30">
                  <button
                    onClick={handleRecenter}
                    className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-slate-600 shadow-xl hover:bg-gray-50 transition-all active:scale-95 group"
                    title="Recenter on Driver"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">🎯</span>
                  </button>
                  {passengerPos && (
                    <div className="w-12 h-12 rounded-2xl bg-brand-mint border border-white flex items-center justify-center text-white shadow-xl shadow-brand-mint/20 cursor-default animate-in fade-in slide-in-from-right-4">
                      <span className="text-[10px] font-black tracking-widest">ME</span>
                    </div>
                  )}
                </div>
              </div>

              {/* BOTTOM DETAILS SECTION (Premium Bottom Sheet Style) */}
              <div className="p-5 md:p-6 bg-white/95 backdrop-blur-xl border-t border-gray-100 z-20 relative rounded-t-[3rem] md:rounded-t-none shadow-[0_-15px_40px_rgba(0,0,0,0.04)]">
                {/* Mobile Handle */}
                <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5 md:hidden"></div>

                <div className="flex items-center justify-between gap-4 max-w-5xl mx-auto">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-[2rem] bg-indigo-50 flex items-center justify-center text-2xl shadow-sm border border-indigo-100">
                      {role === 'driver' ? '👤' : '👨‍✈️'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[8px] md:text-[9px] text-slate-400 font-black uppercase tracking-widest opacity-80">
                          {role === 'driver' ? 'Passenger Detail' : 'Fleet Captain'}
                        </span>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-brand-mint/10 border border-brand-mint/10">
                          <span className="text-[9px] font-black text-brand-mint">{distanceInfo.distance}</span>
                        </div>
                      </div>
                      <div className="text-lg md:text-2xl font-black text-slate-900 leading-none truncate">
                        {role === 'driver' ? (userData?.name || "Passenger") : (userData?.driverName || "Driver Not Assigned")}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">📞</span>
                          <span className="text-xs font-bold text-slate-500">
                            {role === 'driver' ? (userData?.mobile || "No Number") : (userData?.driverMobile || "No Number")}
                          </span>
                        </div>
                        {role !== 'driver' && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs">🚗</span>
                            <span className="text-xs font-black text-slate-400 tracking-wider">
                              {userData?.vehicleNumber || "Vehicle Pending"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Desktop Status */}
                    <div className="hidden lg:flex flex-col items-end px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${tracking ? 'bg-brand-mint shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-300'}`}></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{status}</span>
                      </div>
                      <div className="text-[9px] font-bold text-slate-300 mt-1 uppercase">Cloud Sync Active</div>
                    </div>

                    <a
                      href={`tel:${role === 'driver' ? userData?.mobile : userData?.driverMobile}`}
                      className="w-14 h-14 md:w-auto md:px-8 md:h-14 bg-brand-mint hover:bg-green-600 flex items-center justify-center gap-3 rounded-[1.5rem] shadow-xl shadow-brand-mint/20 active:scale-95 transition-all text-white font-black text-xs uppercase tracking-wider group"
                    >
                      <span className="text-xl md:text-lg">📞</span>
                      <span className="hidden md:inline">Call Contact</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
            <div className="w-14 h-14 border-4 border-brand-mint border-t-transparent rounded-full animate-spin shadow-lg shadow-brand-mint/10"></div>
            <div className="text-center">
              <p className="text-slate-900 text-sm font-black uppercase tracking-widest">Enroute...</p>
              <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-widest">Fetching Radar Data</p>
            </div>
          </div>
        )}

        {/* DRIVER START OVERLAY */}
        {role === 'driver' && !tracking && userData && (
          <div className="absolute inset-0 z-[100] bg-slate-900/40 backdrop-blur-2xl flex items-center justify-center p-6">
            <div className="bg-white border border-gray-100 p-10 rounded-[3rem] shadow-2xl text-center w-full max-w-sm space-y-8 animate-in zoom-in-95 duration-300">
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-50 flex items-center justify-center text-5xl mx-auto shadow-inner">🚀</div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-brand-mint border-4 border-white flex items-center justify-center animate-bounce">
                  <span className="text-white text-[10px] font-black">!</span>
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900">Mission Ready?</h2>
                <p className="text-slate-400 text-xs font-medium mt-2">Start sharing your live location with passenger</p>
              </div>
              <button
                onClick={startTracking}
                className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-[2rem] shadow-2xl active:scale-[0.97] transition-all text-sm uppercase tracking-widest"
              >
                Go Online & Track
              </button>
              <div className="pt-4 border-t border-gray-50 flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 bg-brand-mint rounded-full"></div>
                <span className="text-[9px] font-black text-slate-300 uppercase">GPS Accuracy: High</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
