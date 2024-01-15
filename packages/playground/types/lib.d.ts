import type {
  ProducerConfig,
  ProducerProps,
  State,
  StateInterface,
} from "async-states";

type AnyState = State<any, any, any>;
type AnyInstance = StateInterface<any, any, any>;
type AnyProducerProps = ProducerProps<any, any, any>;
type AnyProducerConfig = ProducerConfig<any, any, any>;
