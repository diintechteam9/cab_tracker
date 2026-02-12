import { useEffect, useState, useRef } from "react";
import { socket } from "../api/socket";
import Map from "../components/Map";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("create");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [destText, setDestText] = useState("");

  const sourceRef = useRef(null);
  const destRef = useRef(null);
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
    // Initialize Autocomplete
    if (window.google && activeTab === "create") {
      const srcAutocomplete = new google.maps.places.Autocomplete(sourceRef.current);
      srcAutocomplete.addListener("place_changed", () => {
        const place = srcAutocomplete.getPlace();
        if (place.geometry) {
          setSource({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
          setSourceText(place.formatted_address);
        }
      });

      const dstAutocomplete = new google.maps.places.Autocomplete(destRef.current);
      dstAutocomplete.addListener("place_changed", () => {
        const place = dstAutocomplete.getPlace();
        if (place.geometry) {
          setDestination({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
          setDestText(place.formatted_address);
        }
      });
    }
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
    if (!name || !mobile || !source || !destination) {
      alert("Please select locations from the dropdown hints");
      return;
    }

    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        mobile,
        sourceLat: source.lat,
        sourceLng: source.lng,
        destLat: destination.lat,
        destLng: destination.lng,
      }),
    });

    const resData = await response.json();
    if (resData.success) {
      setNewLink(resData.link);
      fetchUsers();
      setName("");
      setMobile("");
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
    const link = `${window.location.origin}/track?token=${token}`;
    navigator.clipboard.writeText(link);
    alert("Link copied!");
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white font-sans overflow-hidden">
      {/* SIDEBAR */}
      <div className="w-80 flex flex-col border-r border-gray-800 bg-gray-900 shadow-xl">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Admin Panel
          </h1>
        </div>

        {/* TABS HEADER */}
        <div className="flex border-b border-gray-800 text-xs font-bold uppercase tracking-tighter">
          <button
            onClick={() => setActiveTab("create")}
            className={`flex-1 py-3 transition-colors ${activeTab === "create" ? "text-blue-400 border-b-2 border-blue-400 bg-blue-400/5" : "text-gray-500 hover:text-gray-300"}`}
          >
            Create
          </button>
          <button
            onClick={() => setActiveTab("tracking")}
            className={`flex-1 py-3 transition-colors ${activeTab === "tracking" ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-400/5" : "text-gray-500 hover:text-gray-300"}`}
          >
            Tracking
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-3 transition-colors ${activeTab === "history" ? "text-purple-400 border-b-2 border-purple-400 bg-purple-400/5" : "text-gray-500 hover:text-gray-300"}`}
          >
            History
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* CREATE TAB */}
          {activeTab === "create" && (
            <div className="p-6 space-y-4 animate-in fade-in slide-in-from-left-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">New Journey</h3>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Passenger Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Mobile (91xxxx)"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
              <div className="relative">
                <input
                  ref={sourceRef}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Starting Point (Hint enabled)"
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                />
              </div>
              <div className="relative">
                <input
                  ref={destRef}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Destination (Hint enabled)"
                  value={destText}
                  onChange={(e) => setDestText(e.target.value)}
                />
              </div>
              <button
                onClick={createUser}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg active:scale-95"
              >
                Launch Trip
              </button>

              {newLink && (
                <div className="mt-4 p-4 bg-emerald-900/30 border border-emerald-500/50 rounded-xl">
                  <p className="text-[10px] text-emerald-400 uppercase font-black mb-2">Success! Link Generated:</p>
                  <div className="flex items-center gap-2">
                    <input readOnly value={newLink} className="flex-1 bg-black/40 text-[10px] p-2 rounded font-mono border-none outline-none" />
                    <button onClick={() => { navigator.clipboard.writeText(newLink); alert("Copied!"); }} className="bg-emerald-600 p-2 rounded text-xs">📋</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TRACKING TAB */}
          {activeTab === "tracking" && (
            <div className="p-4 space-y-3 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">Live Trips</h3>
              {users.filter(u => u.status === "ACTIVE").map((u) => (
                <div
                  key={u._id}
                  className={`p-4 rounded-2xl transition-all border ${selectedUser?._id === u._id
                    ? "bg-blue-600/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                    : "bg-gray-800/40 border-gray-700 hover:border-gray-600"
                    }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-bold text-gray-100">{u.name}</div>
                      <div className="text-xs text-gray-500">{u.mobile}</div>
                    </div>
                    <div className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${locations[u.token] ? "bg-emerald-400/20 text-emerald-400" : "bg-gray-700 text-gray-400"
                      }`}>
                      {locations[u.token] ? "● LIVE" : "OFFLINE"}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="text-[11px] py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg transition-all font-bold"
                    >
                      VIEW
                    </button>
                    <button
                      onClick={() => completeRide(u._id)}
                      className="text-[11px] py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg transition-all font-bold"
                    >
                      COMPLETE
                    </button>
                    {locations[u.token]?.speed !== undefined && (
                      <div className="col-span-2 flex justify-between items-center bg-gray-900/40 p-2 rounded-lg border border-gray-800">
                        <div className="text-[10px] text-gray-500 uppercase font-black">Spd: <span className="text-blue-400">{locations[u.token].speed} km/h</span></div>
                        {locations[u.token].gpsStatus === "OFF" && (
                          <div className="text-[9px] text-red-500 animate-pulse font-black uppercase">⚠️ GPS OFF</div>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => copyLink(u.token)}
                      className="col-span-2 text-[10px] py-1.5 bg-gray-700/50 hover:bg-gray-700 text-gray-400 rounded-lg transition-all border border-gray-600"
                    >
                      🔗 COPY TRACKING LINK
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === "history" && (
            <div className="p-4 space-y-3 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">Past Rides</h3>
              {users.filter(u => u.status === "COMPLETED").map((u) => (
                <div key={u._id} className="p-4 rounded-2xl bg-gray-800/20 border border-gray-800/50">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold text-gray-400">{u.name}</div>
                      <div className="text-[10px] text-gray-600 italic">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-500 border border-gray-700">
                      COMPLETED
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MAP AREA */}
      <div className="flex-1 relative">
        <Map
          locations={locations}
          selectedUser={selectedUser}
          source={selectedUser?.source}
          destination={selectedUser?.destination}
          onDirectionsUpdate={(stats) => setTripStats(stats)}
        />

        {selectedUser && (
          <div className="absolute top-8 left-8 bg-gray-900/95 backdrop-blur-md border border-gray-800 p-5 rounded-3xl shadow-2xl animate-in fade-in zoom-in slide-in-from-top-4 w-68">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 text-xl font-bold">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Tracking</div>
                  <div className="text-lg font-bold truncate w-24">{selectedUser.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[18px] font-black text-emerald-400 leading-none">
                  {locations[selectedUser.token]?.speed || 0}
                </div>
                <div className="text-[8px] text-gray-500 font-bold uppercase">KM/H</div>
              </div>
            </div>

            <div className="space-y-3 mb-6 bg-black/20 p-3 rounded-2xl border border-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-gray-500 uppercase font-black italic">Remaining: <span className="text-blue-400 not-italic">{tripStats.distance}</span></div>
                <div className="text-[10px] text-gray-500 uppercase font-black italic">Arrival: <span className="text-blue-400 not-italic">{tripStats.duration}</span></div>
              </div>
              <div className="h-[1px] bg-gray-800 w-full" />
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-gray-500 uppercase font-black">GPS Signal</div>
                <div className={`text-[10px] font-bold ${locations[selectedUser.token]?.gpsStatus === 'OFF' ? 'text-red-500' : 'text-emerald-500'}`}>
                  {locations[selectedUser.token]?.gpsStatus === 'OFF' ? '⚠️ LOST' : '✓ OK'}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-gray-500 uppercase font-black">Last Update</div>
                <div className="text-[10px] text-gray-300">
                  {locations[selectedUser.token]?.lastSeen ? new Date(locations[selectedUser.token].lastSeen).toLocaleTimeString() : 'N/A'}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedUser(null)}
              className="w-full py-3 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-all border border-gray-700 font-bold"
            >
              STOP VIEWING
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
