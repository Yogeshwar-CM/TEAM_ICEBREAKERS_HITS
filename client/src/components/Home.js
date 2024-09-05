import React, { useState } from "react";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import "./Home.css"; // Add your CSS styles here

function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");

  const navigate = useNavigate();

  const generateRoomId = (e) => {
    e.preventDefault();
    const Id = uuid();
    setRoomId(Id);
    toast.success("Room Id is generated");
  };

  const joinRoom = () => {
    if (!roomId || !username) {
      toast.error("Both fields are required");
      return;
    }

    // redirect
    navigate(`/editor/${roomId}`, {
      state: {
        username,
      },
    });
    toast.success("Room is created");
  };

  // when enter then also join
  const handleInputEnter = (e) => {
    if (e.code === "Enter") {
      joinRoom();
    }
  };

  return (
    <div className="container">
      <div className="form-wrapper">
        <div className="form-container">
          <img src="/images/ICEBREAKERS.png" alt="Logo" className="logo" />
          <h4 className="title">Enter the ROOM ID</h4>

          <div className="form-group">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="input-field"
              placeholder="ROOM ID"
              onKeyUp={handleInputEnter}
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              placeholder="USERNAME"
              onKeyUp={handleInputEnter}
            />
          </div>
          <button onClick={joinRoom} className="join-btn">
            JOIN
          </button>
          <p className="info-text">
            Don't have a room ID? create{" "}
            <span onClick={generateRoomId} className="create-room">
              New Room
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Home;
