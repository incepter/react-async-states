import { useAsync } from "react-async-states";

import {
  CacheConfig,
  ProducerProps,
  RunEffect,
  createSource,
} from "async-states";
import qs from "querystring";

type User = {
  id: number;
  name: string;
  username: string;
};

type Pageable = {
  _page: number;
  _limit: number;
};

const fetchUsers = async ({
  signal,
  args,
}: ProducerProps<User[], [Pageable]>) => {
  const params = qs.stringify(args[0]);
  const url = "https://jsonplaceholder.typicode.com/users?" + params;

  const response = await fetch(url, { signal, cache: "no-store" });
  const data = await response.json();

  const users: User[] = data.map((user: User) => {
    const { id, name, username } = user;
    return {
      id,
      name,
      username,
    };
  });

  return users;
};

const users = createSource("users", fetchUsers, {
  // Pending status
  keepPendingForMs: 200,
  skipPendingDelayMs: 100,

  // Run effect
  runEffect: undefined,
  runEffectDurationMs: 0,

  // Cache
  cacheConfig: {
    enabled: false,
    timeout: 0,
    auto: false,
  },
});

export default function useCurrentInstance() {
  const {
    source: { inst },
  } = useAsync(users);

  return {
    instance: inst,
  };
}
