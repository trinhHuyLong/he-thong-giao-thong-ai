import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
} from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Violations from "./pages/Violations";
import "./App.css";

function App() {
  return (
    <Router>
      <div>
        <nav className="navbar">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            🚥 Giám sát Ngã Tư
          </NavLink>
          <NavLink
            to="/violations"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            🚨 Hồ sơ Phạt Nguội
          </NavLink>
        </nav>

        <div className="page-container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/violations" element={<Violations />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
