import React from "react";
import { useLocation } from "react-router-dom";
import { AsyncStateProvider, createSource } from 'react-async-states';
import {
  getUserProducer,
  postsProducer,
  timeoutProducer,
  usersProducer
} from "./producers";

export const demoAsyncStates = {
  timeout: {key: "timeout", producer: timeoutProducer(4000)},

  users: createSource("users", usersProducer, {
    runEffect: "throttle",
    runEffectDurationMs: 1
  }),

  posts: {
    key: "posts", producer: postsProducer, config: {
      cacheConfig: {
        enabled: true,
        deadline: 5000,
      }
    }
  },

  getUser: {key: "get-user", producer: getUserProducer},
}
const asyncStatesDemo = Object.values(demoAsyncStates);

export default function DemoProvider({children}) {
  const location = useLocation();

  const payload = React.useMemo(function getPayload() {
    return {location};
  }, [location]);

  return (
    <AsyncStateProvider payload={payload} initialStates={asyncStatesDemo}>
      {children}
    </AsyncStateProvider>
  );
}
