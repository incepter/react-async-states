"use client";

import { createContext, useState } from "react";
import { createSource } from "react-async-states";

import { fetchUsers, login } from "./producers";
import { AnyInstance, AnyProducerConfig, AnyProducerProps } from "@/types/lib";

/* -------------------------------------------------------------------------- */
/*                                   Sources                                  */
/* -------------------------------------------------------------------------- */

const defaultSourceConfig: AnyProducerConfig = {
  // Pending
  skipPendingStatus: false,
  keepPendingForMs: 500,
  skipPendingDelayMs: 200,

  // Run effect
  runEffect: undefined,
  runEffectDurationMs: 0,

  // Cache
  cacheConfig: {
    enabled: false,
    timeout: 0,
    auto: false,
  },
};

function buildInstances(
  map: Record<
    string,
    {
      fn: (props: AnyProducerProps) => Promise<any>;
      method: "GET" | "POST";
      args: Record<string, unknown>;
    }
  >,
) {
  const instances: Record<string, AnyInstance> = {};

  for (const key in map) {
    const mapData = map[key];
    const instance = createSource(key, mapData.fn, defaultSourceConfig).inst;
    instance.payload = {
      args: mapData.args,
      method: mapData.method,
    };

    instances[key] = instance;
  }

  return instances;
}

const initialState = buildInstances({
  // HERE We can add more instances as long as we have the producers.
  "list-users": {
    fn: fetchUsers,
    method: "GET",
    args: {
      _page: 1,
      _limit: 5,
    },
  },
  "login-user": {
    fn: login,
    method: "POST",
    args: {
      username: "",
      password: "",
    },
  },
});

/* -------------------------------------------------------------------------- */
/*                                   Context                                  */
/* -------------------------------------------------------------------------- */

export const InstancesContext = createContext<{
  instances: Record<string, AnyInstance>;
  currentInstance: AnyInstance;
  setCurrentInstanceKey: (
    newData: string | ((prevData: string | null) => string),
  ) => void;
} | null>(null);

export function InstancesProvider({ children }: { children: React.ReactNode }) {
  const [instances] = useState(initialState);
  const [currentInstanceKey, setCurrentInstanceKey] = useState(
    Object.keys(instances)[0],
  );

  return (
    <InstancesContext.Provider
      value={{
        instances,
        currentInstance: instances[currentInstanceKey],
        setCurrentInstanceKey,
      }}
    >
      {children}
    </InstancesContext.Provider>
  );
}
