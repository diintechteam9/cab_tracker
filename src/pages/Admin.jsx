import { useEffect, useState, useRef } from "react";
import { socket } from "../api/socket";
import Map from "../components/Map";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("create");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverMobile, setDriverMobile] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [destText, setDestText] = useState("");

  const sourceRef = useRef(null);
  const destRef = useRef(null);
  const sourceAutocomplete = useRef(null);
  const destAutocomplete = useRef(null);
  const [source, setSource] = useState(null);
  const [destination, setDestination] = useState(null);

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [locations, setLocations] = useState({});
  const [newLink, setNewLink] = useState("");
  const [tripStats, setTripStats] = useState({ distance: '...', duration: '...' });

  useEffect(() => {
    fetchUsers();
    socket.connect();
    socket.emit("join-admin");

    socket.on("location-update", (data) => {
      setLocations((prev) => ({
        ...prev,
        [data.token]: data,
      }));
    });

    return () => {
      socket.off("location-update");
    };
  }, []);

  useEffect(() => {
    // Initialize Autocomplete once if Ref exists and Tab is Create
    if (window.google && activeTab === "create" && sourceRef.current && destRef.current) {
      // Prevent double initialization
      if (!sourceAutocomplete.current) {
        sourceAutocomplete.current = new google.maps.places.Autocomplete(sourceRef.current);
        sourceAutocomplete.current.addListener("place_changed", () => {
          const place = sourceAutocomplete.current.getPlace();
          if (place.geometry) {
            setSource({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
            setSourceText(place.formatted_address);
          }
        });
      }

      if (!destAutocomplete.current) {
        destAutocomplete.current = new google.maps.places.Autocomplete(destRef.current);
        destAutocomplete.current.addListener("place_changed", () => {
          const place = destAutocomplete.current.getPlace();
          if (place.geometry) {
            setDestination({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
            setDestText(place.formatted_address);
          }
        });
      }
    }

    // Cleanup when component unmounts or tab changes
    return () => {
      if (sourceAutocomplete.current) {
        google.maps.event.clearInstanceListeners(sourceAutocomplete.current);
        sourceAutocomplete.current = null;
      }
      if (destAutocomplete.current) {
        google.maps.event.clearInstanceListeners(destAutocomplete.current);
        destAutocomplete.current = null;
      }
    };
  }, [activeTab]);

  const fetchUsers = async () => {
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/users`);
    const data = await res.json();
    setUsers(data);
  };

  const geocodePlace = (place, cb) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: place }, (results, status) => {
      if (status === "OK") {
        const loc = results[0].geometry.location;
        cb({ lat: loc.lat(), lng: loc.lng() });
      } else {
        alert("Location not found: " + place);
      }
    });
  };

  const createUser = async () => {
    // 1. Check basic fields
    if (!name || !mobile || !driverName || !driverMobile || !vehicleNumber || !sourceText || !destText) {
      alert("Please fill all required details");
      return;
    }

    // 2. Helper to get coordinates (Either from state or by GeoCoding)
    const resolveLocation = async (text, currentCoords) => {
      if (currentCoords) return currentCoords;

      return new Promise((resolve) => {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: text }, (results, status) => {
          if (status === "OK") {
            const loc = results[0].geometry.location;
            resolve({ lat: loc.lat(), lng: loc.lng() });
          } else {
            resolve(null);
          }
        });
      });
    };

    // 3. Resolve source and destination
    const resolvedSource = await resolveLocation(sourceText, source);
    const resolvedDest = await resolveLocation(destText, destination);

    if (!resolvedSource || !resolvedDest) {
      alert("Could not find coordinates for the addresses. Please select from the dropdown hints.");
      return;
    }

    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        mobile,
        sourceLat: resolvedSource.lat,
        sourceLng: resolvedSource.lng,
        sourceAddress: sourceText,
        destLat: resolvedDest.lat,
        destLng: resolvedDest.lng,
        destAddress: destText,
        driverName,
        driverMobile,
        vehicleNumber,
      }),
    });

    const resData = await response.json();
    if (resData.success) {
      setNewLink(resData.link);
      fetchUsers();
      setName("");
      setMobile("");
      setDriverName("");
      setDriverMobile("");
      setVehicleNumber("");
      setSourceText("");
      setDestText("");
      setSource(null);
      setDestination(null);
    } else {
      alert("Error: " + resData.error);
    }
  };

  const completeRide = async (id) => {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/complete/${id}`, {
      method: "PUT",
    });
    const data = await response.json();
    if (data.success) {
      alert("Ride marked as COMPLETED");
      fetchUsers();
      if (selectedUser?._id === id) setSelectedUser(null);
    }
  };

  const copyLink = (token) => {
    const link = `${window.location.origin}/track?token=${token}&role=passenger`;
    navigator.clipboard.writeText(link);
    alert("Link copied!");
  };

  const renderFleetCard = (u, isCompleted = false) => {
    const loc = locations[u.token];
    return (
      <div
        key={u._id}
        className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand-mint/10 group-hover:text-brand-mint transition-colors">
              👤
            </div>
            <div>
              <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{u.token.slice(-6)}</div>
              <div className="text-sm font-black text-slate-900 leading-tight">{u.name}</div>
            </div>
          </div>
          {loc ? (
            <span className="bg-brand-mint/10 text-brand-mint text-[8px] font-black px-2 py-0.5 rounded-full border border-brand-mint/20">● LIVE</span>
          ) : isCompleted ? (
            <span className="bg-slate-900 text-white text-[8px] font-black px-2 py-0.5 rounded-full">DONE</span>
          ) : (
            <span className="bg-slate-100 text-slate-400 text-[8px] font-black px-2 py-0.5 rounded-full">WAITING</span>
          )}
        </div>

        <div className="space-y-3 relative">
          {/* Path Line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-[1.5px] border-l border-dotted border-slate-200"></div>

          <div className="flex items-start gap-3 pl-1">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200 bg-white z-10 shrink-0 mt-0.5"></div>
            <div className="text-[10px] text-slate-500 font-medium leading-tight">
              {u.sourceAddress || "Pickup Point"}
            </div>
          </div>

          <div className="flex items-start gap-3 pl-1">
            <div className="w-3.5 h-3.5 rounded-full bg-brand-mint z-10 shrink-0 mt-0.5 shadow-[0_0_8px_rgba(34,197,94,0.3)]"></div>
            <div className="text-[10px] text-slate-900 font-bold leading-tight">
              {u.destAddress || "Destination"}
            </div>
          </div>
        </div>

        {!isCompleted && loc && (
          <div className="mt-4 grid grid-cols-2 gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-100">
            <div className="text-center p-1">
              <div className="text-[10px] font-black text-slate-900">{loc.speed || 0}</div>
              <div className="text-[7px] font-bold text-slate-400 uppercase">SPEED KM/H</div>
            </div>
            <div className="text-center p-1 border-l border-gray-200">
              <div className="text-[10px] font-black text-brand-mint">Active</div>
              <div className="text-[7px] font-bold text-slate-400 uppercase">STATUS</div>
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {!isCompleted && (
            <button
              onClick={() => setSelectedUser(u)}
              className="flex-1 py-2 text-[9px] font-black uppercase text-brand-mint bg-brand-mint/5 hover:bg-brand-mint/10 rounded-xl transition-all border border-brand-mint/10"
            >
              Track Live
            </button>
          )}
          {!isCompleted && (
            <button
              onClick={() => completeRide(u._id)}
              className="flex-1 py-2 text-[9px] font-black uppercase text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-200/50"
            >
              Complete
            </button>
          )}
          {isCompleted && (
            <button className="flex-1 py-2 text-[9px] font-black uppercase text-slate-400 bg-slate-50 rounded-xl border border-slate-100 cursor-not-allowed">
              View Report
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-fleet-bg text-slate-800 font-sans overflow-hidden">
      {/* TOP HEADER */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-brand-mint">
            <div className="w-8 h-8 rounded-lg bg-brand-mint/10 flex items-center justify-center">
              <span className="text-xl">🚀</span>
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">FleetOps <span className="text-slate-400 font-medium">Manager</span></span>
          </div>

          <div className="hidden md:flex relative group">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              className="bg-gray-100 border-none rounded-xl pl-10 pr-4 py-2 text-xs w-64 focus:ring-2 focus:ring-brand-mint/20 transition-all outline-none"
              placeholder="Search vehicle or driver..."
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center text-slate-500 relative transition-colors">
            <span className="text-lg">🔔</span>
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
          </button>
          <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
            <div className="text-right hidden sm:block">
              <div className="text-[11px] font-bold text-slate-900">Alex M.</div>
              <div className="text-[9px] text-slate-400 font-medium tracking-wider">Fleet Lead</div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-sm font-bold text-orange-600">
              AM
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-6 gap-6">
        {/* BOARD HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Journey Board</h2>
            <p className="text-slate-400 text-xs font-medium">Manage real-time logistics and trip history</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-xl border border-gray-200 flex shadow-sm">
              {[{ id: "tracking", label: "Board" }, { id: "history", label: "List" }, { id: "map", label: "Map" }].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${activeTab === tab.id
                      ? "bg-brand-mint/10 text-brand-mint shadow-inner"
                      : "text-slate-400 hover:text-slate-600"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setActiveTab("create")}
              className={`bg-brand-mint hover:bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-brand-mint/20 active:scale-95 transition-all flex items-center gap-2 ${activeTab === 'create' ? 'ring-2 ring-brand-mint ring-offset-2' : ''}`}
            >
              <span className="text-lg">+</span> New Journey
            </button>
          </div>
        </div>

        {/* MAIN DISPLAY AREA */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === "create" && (
            <div className="max-w-2xl mx-auto h-full overflow-y-auto pr-2 pb-6 scrollbar-hide">
              <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-xl space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                  <div className="w-10 h-10 rounded-2xl bg-brand-mint/10 flex items-center justify-center text-brand-mint text-xl font-bold">📝</div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-none">New Journey</h3>
                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-1">Fill in trip details</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Passenger Name</label>
                    <input
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-mint/10 focus:border-brand-mint outline-none transition-all placeholder:text-slate-300"
                      placeholder="e.g. Anand"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mobile Number</label>
                    <input
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-mint/10 focus:border-brand-mint outline-none transition-all placeholder:text-slate-300"
                      placeholder="91xxxx"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2 relative">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 text-blue-500">Pickup Point</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-blue-500"></span>
                      <input
                        ref={sourceRef}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder:text-slate-300"
                        placeholder="Search for pickup location..."
                        value={sourceText}
                        onChange={(e) => setSourceText(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 relative">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 text-brand-mint">Drop-off Destination</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-brand-mint"></span>
                      <input
                        ref={destRef}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:ring-2 focus:ring-brand-mint/10 focus:border-brand-mint outline-none transition-all placeholder:text-slate-300"
                        placeholder="Search for destination..."
                        value={destText}
                        onChange={(e) => setDestText(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-200 space-y-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-5 h-[1px] bg-slate-200"></span> Driver Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-mint/10 focus:border-brand-mint outline-none transition-all"
                      placeholder="Driver Name"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                    />
                    <input
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-mint/10 focus:border-brand-mint outline-none transition-all"
                      placeholder="Driver Mobile"
                      value={driverMobile}
                      onChange={(e) => setDriverMobile(e.target.value)}
                    />
                  </div>
                  <input
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-mint/10 focus:border-brand-mint outline-none transition-all"
                    placeholder="Vehicle Number (e.g. DL 1S AB 1234)"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={createUser}
                    className="w-full bg-brand-mint hover:bg-green-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-brand-mint/20 active:scale-[0.98] transition-all text-sm uppercase tracking-wider"
                  >
                    Launch Journey 🚀
                  </button>
                </div>

                {newLink && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl animate-in slide-in-from-top-4">
                    <p className="text-[10px] text-emerald-600 uppercase font-black mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Success! Link Generated:
                    </p>
                    <div className="flex items-center gap-2">
                      <input readOnly value={newLink} className="flex-1 bg-white text-[10px] p-2.5 rounded-xl font-mono border border-emerald-100 outline-none text-emerald-800" />
                      <button onClick={() => { navigator.clipboard.writeText(newLink); alert("Copied!"); }} className="bg-emerald-500 text-white p-2.5 rounded-xl hover:bg-emerald-600 transition-colors shadow-lg">📋</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "tracking" && (
            <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden pb-4">
              {/* BOARD COLUMNS */}
              <div className="flex flex-col gap-4 min-h-0 min-w-0">
                <div className="flex items-center justify-between px-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-200 border-2 border-slate-300"></span>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Pending</h3>
                    <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
                      {users.filter(u => u.status === "ACTIVE" && !locations[u.token]).length}
                    </span>
                  </div>
                  <button className="text-slate-400 hover:text-slate-600 text-xs">•••</button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
                  {users.filter(u => u.status === "ACTIVE" && !locations[u.token]).map((u) => renderFleetCard(u))}
                  {users.filter(u => u.status === "ACTIVE" && !locations[u.token]).length === 0 && (
                    <div className="h-32 rounded-3xl border-2 border-dashed border-slate-100 flex items-center justify-center text-slate-300 text-[10px] font-bold uppercase tracking-widest">No trips pending</div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4 min-h-0 min-w-0">
                <div className="flex items-center justify-between px-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-mint animate-pulse"></span>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">In Progress</h3>
                    <span className="bg-brand-mint/10 text-brand-mint text-[10px] font-bold px-2 py-0.5 rounded-full border border-brand-mint/20">
                      {users.filter(u => u.status === "ACTIVE" && locations[u.token]).length}
                    </span>
                  </div>
                  <button className="text-slate-400 hover:text-slate-600 text-xs">🔄</button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
                  {users.filter(u => u.status === "ACTIVE" && locations[u.token]).map((u) => renderFleetCard(u))}
                  {users.filter(u => u.status === "ACTIVE" && locations[u.token]).length === 0 && (
                    <div className="h-32 rounded-3xl border-2 border-dashed border-slate-100 flex items-center justify-center text-slate-300 text-[10px] font-bold uppercase tracking-widest">No active trips</div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4 min-h-0 min-w-0">
                <div className="flex items-center justify-between px-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border-2 border-slate-700"></span>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Completed</h3>
                    <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                      {users.filter(u => u.status === "COMPLETED").length}
                    </span>
                  </div>
                  <button className="text-slate-400 hover:text-slate-600 text-xs">🕙</button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
                  {users.filter(u => u.status === "COMPLETED").map((u) => renderFleetCard(u, true))}
                  {users.filter(u => u.status === "COMPLETED").length === 0 && (
                    <div className="h-32 rounded-3xl border-2 border-dashed border-slate-100 flex items-center justify-center text-slate-300 text-[10px] font-bold uppercase tracking-widest">No history yet</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xl h-full flex flex-col overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Full Trip Log</h3>
                <button className="text-[10px] font-black uppercase text-brand-mint hover:underline">Export CSV</button>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white z-10 shadow-sm">
                    <tr className="border-b border-gray-50 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      <th className="px-6 py-4">Passenger</th>
                      <th className="px-6 py-4">Driver</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600 text-sm">
                    {users.map(u => (
                      <tr key={u._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{u.name}</td>
                        <td className="px-6 py-4">{u.driverName || "N/A"}</td>
                        <td className="px-6 py-4 text-xs font-medium">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${u.status === 'ACTIVE' ? 'bg-brand-mint/10 text-brand-mint' : 'bg-slate-100 text-slate-500'
                            }`}>
                            {u.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "map" && (
            <div className="h-full relative rounded-3xl overflow-hidden border border-gray-200 shadow-2xl bg-white p-2">
              <Map
                locations={locations}
                selectedUser={selectedUser}
                source={selectedUser?.source}
                destination={selectedUser?.destination}
                onDirectionsUpdate={(stats) => setTripStats(stats)}
              />
              {selectedUser && (
                <div className="absolute top-8 left-8 bg-white/95 backdrop-blur-xl border border-gray-200 p-5 rounded-3xl shadow-2xl animate-in fade-in zoom-in slide-in-from-top-4 w-72 h-auto space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-base font-black">
                        {selectedUser.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Live View</div>
                        <div className="text-base font-black text-slate-900 truncate w-24">{selectedUser.name}</div>
                      </div>
                    </div>
                    <button onClick={() => setSelectedUser(null)} className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center text-slate-300 hover:text-slate-600 transition-colors">✕</button>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div>
                      <div className="text-[20px] font-black text-slate-900 leading-none">
                        {locations[selectedUser.token]?.speed || 0}
                      </div>
                      <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">KM/H SPEED</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase font-black">ETA: <span className="text-brand-mint">{tripStats.duration}</span></div>
                      <div className="text-[10px] text-slate-500 uppercase font-black">Left: <span className="text-brand-mint">{tripStats.distance}</span></div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedUser(null)}
                    className="w-full py-3 text-[10px] bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all font-black uppercase tracking-widest shadow-xl active:scale-[0.97]"
                  >
                    Detatch Tracking
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
