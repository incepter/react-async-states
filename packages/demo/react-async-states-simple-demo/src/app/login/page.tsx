import React, {FormEvent, FormEventHandler} from "react";
import {app} from "../app";

function login(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
  let {elements} = (event.target as HTMLFormElement)
  // @ts-ignore
  let userId = elements.namedItem("username").value
  // @ts-ignore
  // let password = elements.namedItem("password").value
  app.auth.login().run(userId, "nopassword")
}


export default function LoginPage() {
  let {state: {status}} = app.auth.login.useAsyncState()

  return (
    <section>
      <form style={{display: "flex"}} onSubmit={login}>
        <select style={{height: 40}} name="username" defaultValue="1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(t => <option value={t}
                                                            key={t}>{t}</option>)}
        </select>
        {/*<input name="password" defaultValue="anypassword"/>*/}
        <button disabled={status === "pending"} type="submit">Go</button>
      </form>
    </section>
  )
}
