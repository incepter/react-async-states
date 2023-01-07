---
sidebar_position: 2
sidebar_label: State sharing
---

# State sharing

Any state you create by the library is shared and will be accessible from
your whole application without tuning or configuration.

Only one single instance is created in memory for a given key, if you attempt
to recreate it, its producer and configuration will change only. It won't get created
