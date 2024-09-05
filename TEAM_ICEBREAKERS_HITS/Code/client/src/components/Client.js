import React, { useMemo } from "react";
import * as avatars from "@dicebear/avatars";
import * as style from "@dicebear/avatars-bottts-sprites";

function Client({ username }) {
  // Use useMemo to generate the avatar only when the username changes
  const avatar = useMemo(() => {
    return new avatars.default(style.default, {
      seed: username, // Use username as seed for consistency
      dataUri: true, // Return as data URI
    }).create();
  }, [username]);

  return (
    <div className="d-flex align-items-center rounded mr-4">
      {/* Render the avatar using an img tag */}
      <img
        src={avatar}
        alt={`${username}'s avatar`}
        style={{
          width: "50px",
          height: "50px",
          borderRadius: "50%",
          marginRight: "2px", // Adjust margin to bring text closer
        }}
      />
      <span className="mx-1">{username}</span> {/* Adjusted margin */}
    </div>
  );
}

export default Client;
