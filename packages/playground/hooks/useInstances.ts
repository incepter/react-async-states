import { useState } from "react";

export default function useInstances() {
  const [instances] = useState({
    users: {
      key: "users",
    },
    addUser: {
      key: "addUser",
    },
  });

  return {
    instances,
  };
}
