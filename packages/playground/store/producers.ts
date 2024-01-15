import { ProducerProps } from "react-async-states";

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

type Credentials = {
  username: string;
  password: string;
};

class APIError extends Error {
  public data: unknown;

  constructor(data: unknown) {
    super();
    this.data = data;
  }
}

export const fetchUsers = async ({
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

export const login = async ({
  signal,
  args,
}: ProducerProps<User, [Credentials], Promise<any>>) => {
  const [credentials] = args;
  const url = "https://dummyjson.com/auth/login";
  console.log(credentials);
  const response = await fetch(url, {
    signal,
    cache: "no-store",
    method: "POST",
    body: JSON.stringify(credentials),
    headers: {
      "Content-Type": "application/json",
    },
  });
  const json = await response.json();

  if (!response.ok) {
    throw json;
  }

  const { id, firstName, lastName, username } = json;

  const user: User = {
    id: id,
    name: `${firstName} ${lastName}`,
    username: username,
  };

  return user;
};
