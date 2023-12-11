export {
  useBoundary,
  StateBoundary,
  RenderStrategy,
  useCurrentState,
  FetchThenRenderBoundary,
  RenderThenFetchBoundary,
  FetchAsYouRenderBoundary
} from "./StateBoundary";

export type {
  BoundarySourceContextType,
  BoundaryContextValue,
  BoundaryContext,
  StateBoundaryProps,
  StateBoundaryRenderProp
} from "./StateBoundary";

export {run, runLane, runInContext, runLaneInContext} from "./run";
export {addBooleanStatus} from "./selectors";
export type {StateWithBooleanStatus} from "./selectors";

let didWarnAboutDeprecation = false;

if (!didWarnAboutDeprecation) {
  didWarnAboutDeprecation = true;
  console.error("[Warning] react-async-states-utils is deprecated.\n" +
    "It was on top of react-async-states and you can find the latest" +
    "version in this link: https://github.com/incepter/react-async-states/tree/d8317cbee86f119d9a3286d9f1ef648897a0484a/packages/react-async-states-utils/src .");
}
