import {createBrowserRouter,} from "react-router-dom";

export const router = createBrowserRouter([
  {
    path: "/",
    lazy: () => import("./entry"),
    children: [
      {
        path: "users",
        lazy: () => import("./users/page"),
        children: [
          {
            path: ":userId",
            lazy: () => import("./users/user-details/page"),
            children: [
              {
                path: "posts",
                lazy: () => import("./users/user-details/user-posts/page"),
              },
            ]
          }
        ]
      },
      {
        path: "posts",
        lazy: () => import("./posts/page"),
        // children: [
        //   {
        //     path: ":userId",
        //     lazy: () => import("./users/user-details/page"),
        //     children: [
        //       {
        //         path: "posts",
        //         lazy: () => import("./users/user-details/user-posts/page"),
        //       },
        //     ]
        //   }
        // ]
      }
    ]
  },
]);
