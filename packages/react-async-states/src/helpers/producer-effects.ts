import {
  AsyncStateKeyOrSource,
  AsyncStateManagerInterface
} from "../types.internal";
import AsyncState, {
  AbortFn,
  AsyncStateInterface,
  AsyncStateKey,
  AsyncStateSource,
  AsyncStateStatus, Producer,
  ProducerProps,
  ProducerPropsRunConfig,
  ProducerPropsRunInput,
  ProducerEffects,
  State
} from "../async-state";
import {invokeIfPresent, isFn, shallowClone} from "../../../shared";
import {nextKey} from "./key-gen";
import {isAsyncStateSource} from "../async-state/utils";
import {readAsyncStateFromSource} from "../async-state/AsyncState";
