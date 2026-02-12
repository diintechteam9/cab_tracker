import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Admin from "./pages/Admin";
import Track from "./pages/Track";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/admin" />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/track" element={<Track />} />
    </Routes>
  </BrowserRouter>
);

export default App;
