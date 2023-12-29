This is the devtools for [react-async-states](https://github.com/incepter/react-async-states) package.

It is still experimental and in alpha phase.

Usage:

```tsx
import DevtoolsView from "async-states-devtools";

// then embed anywhere in your tree:
<DevtoolsView />;
```

or

```tsx
import { AutoConfiguredDevtools } from "async-states-devtools";

// embed this devtools anywhere
<AutoConfiguredDevtools />;
```

or

```tsx
import { autoConfigureDevtools } from "async-states-devtools";

// or just let magic happen by itself
autoConfigureDevtools();
```

Note/issue: The devtools uses antd for now (will be removed), so your styles may
clash if also using antd.

Antd will be removed from the library asap.
