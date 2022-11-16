import {DevtoolsView} from "./DevtoolsView";
import './index.css'

export default function DevtoolsViewLib({style}) {
  return (
    <div style={style}>
      <hr/>
      <DevtoolsView/>
    </div>
  );
}
