import { useEffect, useState, useRef } from "react";
import { socket } from "../api/socket";
import Map from "../components/Map";
import DashboardLayout from "../components/DashboardLayout";
import KanbanBoard from "../components/KanbanBoard";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("kanban"); // Default to Kanban Board
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
  const [tripStats, setTripStats] = useState({ distance: '...', duration: '...' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [historyPath, setHistoryPath] = useState(null);

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

  // Google Maps Autocomplete Logic (Only when Modal is Open)
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places && showCreateModal && sourceRef.current && destRef.current) {
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
  }, [showCreateModal]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  const createUser = async () => {
    if (!name || !mobile || !driverName || !driverMobile || !vehicleNumber || !sourceText || !destText) {
      alert("Please fill all required details");
      return;
    }

    const resolveLocation = async (text, currentCoords) => {
      if (currentCoords) return currentCoords;
      return new Promise((resolve) => {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: text }, (results, status) => {
          if (status === "OK") {
            const loc = results[0].geometry.location;
            console.log(`[DEBUG] Geocoding Success for '${text}':`, loc.lat(), loc.lng());
            resolve({ lat: loc.lat(), lng: loc.lng() });
          } else {
            console.error(`[ERROR] Geocoding Failed for '${text}':`, status);
            alert(`Address not found: ${text} (Status: ${status})`);
            resolve(null);
          }
        });
      });
    };

    const resolvedSource = await resolveLocation(sourceText, source);
    const resolvedDest = await resolveLocation(destText, destination);

    if (!resolvedSource || !resolvedDest) {
      alert("Could not find coordinates for the addresses.");
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, mobile,
          sourceLat: resolvedSource.lat, sourceLng: resolvedSource.lng, sourceAddress: sourceText,
          destLat: resolvedDest.lat, destLng: resolvedDest.lng, destAddress: destText,
          driverName, driverMobile, vehicleNumber,
        }),
      });

      const resData = await response.json();
      if (resData.success) {
        fetchUsers();
        setName(""); setMobile(""); setDriverName(""); setDriverMobile(""); setVehicleNumber("");
        setSourceText(""); setDestText(""); setSource(null); setDestination(null);
        setShowCreateModal(false);
        alert("Journey Created via WhatsApp!");
      } else {
        alert("Error: " + resData.error);
      }
    } catch (error) {
      console.error("Create User Error:", error);
      alert("Failed to connect to server. Check if backend is running.");
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
    }
  };

  const handleViewHistory = async (user) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/history/${user.token}`);
      if (res.ok) {
        const history = await res.json();
        // Convert history objects to LatLng literals
        const path = history.map(loc => ({ lat: loc.lat, lng: loc.lng }));
        setHistoryPath(path);
        setSelectedUser(null); // Clear to prevent directions from showing
        setActiveTab('map');
      } else {
        alert("No history found");
      }
    } catch (error) {
      console.error(error);
      alert("Error fetching history");
    }
  };

  const handleTrackUser = (user) => {
    setHistoryPath(null); // Clear history path when tracking live
    setSelectedUser(user);
    setActiveTab('map');
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onNewJourney={() => setShowCreateModal(true)}
    >
      {/* ----------------- MODAL (Create Journey) ----------------- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-300">

            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-slate-400 z-50 transition-colors"
            >✕</button>

            <div className="flex-1 p-8 md:p-10 overflow-y-auto scrollbar-hide">
              <header className="mb-8">
                <h3 className="text-2xl font-bold text-slate-900">Create New Journey</h3>
                <p className="text-slate-400 text-sm font-medium">Step 1: Assign driver and define route</p>
              </header>

              <div className="space-y-8">
                {/* Driver Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input className="input-field" placeholder="Driver Name" value={driverName} onChange={e => setDriverName(e.target.value)} />
                  <input className="input-field" placeholder="Vehicle Number" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} />
                  <input className="input-field" placeholder="Driver Mobile" value={driverMobile} onChange={e => setDriverMobile(e.target.value)} />
                </div>
                {/* Passenger Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input className="input-field" placeholder="Passenger Name" value={name} onChange={e => setName(e.target.value)} />
                  <input className="input-field" placeholder="Passenger Mobile" value={mobile} onChange={e => setMobile(e.target.value)} />
                </div>

                {/* Locations */}
                <div className="space-y-4">
                  <input ref={sourceRef} className="input-field" placeholder="Pickup Address" value={sourceText} onChange={e => setSourceText(e.target.value)} />
                  <input ref={destRef} className="input-field" placeholder="Destination Address" value={destText} onChange={e => setDestText(e.target.value)} />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-4">
                <button onClick={() => setShowCreateModal(false)} className="text-gray-500 font-bold px-4">Cancel</button>
                <button onClick={createUser} className="bg-primary hover:bg-primary-dark text-background-dark font-bold px-8 py-3 rounded-xl transition-colors">
                  Create Journey
                </button>
              </div>
            </div>

            {/* Map Preview Side */}
            <div className="hidden md:flex w-[400px] bg-gray-900 relative">
              <Map
                source={source}
                destination={destination}
                locations={{}}
                selectedUser={null}
                showRoutePreview={true}
              />
              {!source && !destination && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
                  <div className="text-center">
                    <span className="text-6xl mb-4 block">🗺️</span>
                    <p className="text-sm text-gray-400 font-bold">Enter addresses to preview route</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB: KANBAN BOARD ----------------- */}
      {activeTab === 'kanban' && (
        <KanbanBoard
          users={users}
          locations={locations}
          onTrack={handleTrackUser}
          onComplete={completeRide}
          onViewHistory={handleViewHistory}
        />
      )}

      {/* ----------------- TAB: LIST (Table) ----------------- */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xl h-full flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white z-10 shadow-sm border-b border-gray-100">
                <tr>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 text-xs font-bold text-gray-400 uppercase">Passenger</th>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 text-xs font-bold text-gray-400 uppercase">Driver</th>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 text-xs font-bold text-gray-400 uppercase">Status</th>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 text-xs font-bold text-gray-400 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="text-xs sm:text-sm">
                {users.map(u => (
                  <tr key={u._id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-3 sm:px-6 sm:py-4 font-bold">{u.name}</td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4">{u.driverName || "N/A"}</td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${u.status === 'ACTIVE' ? 'bg-primary/20 text-primary-dark' : 'bg-gray-100 text-gray-500'
                        }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4">
                      {u.status === 'ACTIVE' && (
                        <button onClick={() => handleTrackUser(u)} className="text-primary-dark hover:underline font-medium">Track</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------- TAB: MAP (Full Screen) ----------------- */}
      {activeTab === 'map' && (
        <div className="absolute inset-0 rounded-3xl overflow-hidden border border-gray-200 shadow-xl bg-gray-900">
          <Map
            locations={locations}
            selectedUser={selectedUser}
            source={selectedUser?.source}
            destination={selectedUser?.destination}
            onDirectionsUpdate={setTripStats}
            historyPath={historyPath}
          />
          {selectedUser && (
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg border border-white max-w-xs">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-lg">{selectedUser.name}</h4>
                <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <div className="text-xs text-gray-500 uppercase">Speed</div>
                  <div className="font-bold text-lg">{locations[selectedUser.token]?.speed || 0}</div>
                </div>
                <div className="bg-gray-100 p-2 rounded-lg">
                  <div className="text-xs text-gray-500 uppercase">ETA</div>
                  <div className="font-bold text-lg text-primary-dark">{tripStats.duration}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .input-field {
            width: 100%;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 1rem;
            padding: 0.75rem 1rem;
            font-size: 0.875rem;
            font-weight: 600;
            color: #4b5563;
            outline: none;
            transition: all 0.2s;
        }
        .input-field:focus {
            border-color: #2bee8c;
            box-shadow: 0 0 0 3px rgba(43, 238, 140, 0.1);
        }
      `}</style>
    </DashboardLayout>
  );
}
