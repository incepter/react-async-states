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
    runEffectDurationMs: 3000,
    cacheConfig: {
      enabled: true,
      hash(args, payload) {
        return "users";
      },
      getDeadline: () => 50000,
      load() {
        return JSON.parse(localStorage.getItem("users-cache"));
      },
      persist(st) {
        localStorage.setItem("users-cache", JSON.stringify(st));
      }
    }
  }),

  posts: {
    key: "posts",
    producer: postsProducer,
    config: {
      cacheConfig: {
        enabled: true,
        hash(args, payload) {
          return "posts";
        },
        getDeadline: () => 50000,
        load() {
          return new Promise((res) => {
            setTimeout(() => {
              res(JSON.parse(localStorage.getItem("posts-cache")))
            }, 5000)
          });
        },
        persist(st) {
          localStorage.setItem("posts-cache", JSON.stringify(st));
        }
      }
    }
  },

  getUser: {
    key: "get-user",
    producer: getUserProducer,
    config: {
      cacheConfig: {
        enabled: true,
        hash(args, payload) {
          return `user-${payload?.matchParams?.userId}`;
        },
        getDeadline: () => 1000 * 60 * 5,
        load() {
          // console.log('loading users cache!', JSON.parse(localStorage.getItem("users-cache")));
          return JSON.parse(localStorage.getItem("users-cache"));
        },
        persist(st) {
          // console.log('saving users cache!', st);
          localStorage.setItem("users-cache", JSON.stringify(st));
        }
      },
    }
  },
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
