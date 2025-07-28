import { useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from '../api/axios'
import "./NavUser.css";

const NavUser = () => {
  const cookie = useState();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    try {
      await axios.get("/logout", cookie)
    } catch { console.log(e) }
  }

  return (
    <div className="header-container">
      <div className="logo-container">
        <img
          src="StudyTrackerIcon.png"
          className="logo"
          onClick={() => window.open("https://github.com/alexdeluera/StudyTracker", "_blank")}
          alt="StudyTracker Icon"
        />
      </div>

      {/* Container for Home and Team options */}
      <div className="nav-options">

        <div
          className="header-option-container"
          onClick={() => {
            navigate(`/study`);
          }}
        >
          <div className="header-option-text">Study</div>
        </div>

        <div
          className="header-option-container"
          onClick={() => {
            navigate(`/pomodoro`);
          }}
        >
          <div className="header-option-text">Pomodoro</div>
        </div>

        <div
          className="header-option-container"
          onClick={() => {
            handleSubmit()
            navigate(`/`);
          }}
        >
          <div className="header-option-text">Log Out</div>
        </div>

      </div>
    </div>
  );
};

export default NavUser;