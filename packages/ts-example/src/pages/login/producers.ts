import {createSource, ProducerProps, AsyncStateSource, State} from "react-async-states";
import {UserType} from "../../domains/users/User";
import {bindAbortController} from "../../utils/producer-props";

function principalProducer(props: ProducerProps<UserType>) {
  const {data: {id}} = props.select(currentUserConfig) as State<CurrentUserConfig>;

  const signal = bindAbortController(props);

  return fetch(`https://jsonplaceholder.typicode.com/users/${id}`,{signal})
    .then(r => r.json());
}

export const principalSource = createSource("principal", principalProducer) as AsyncStateSource<UserType>;

export type CurrentUserConfig = {
  id: number | string,
};

export const currentUserConfig = createSource(
  "current-user-config",
  null,
  {initialValue: {id: 1}}
) as AsyncStateSource<CurrentUserConfig>;
