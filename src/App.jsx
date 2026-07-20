import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Play from "./pages/Play";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem("user");
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/play" element={<ProtectedRoute><Play /></ProtectedRoute>} />
    </Routes>
  </BrowserRouter>
);

export default App;
