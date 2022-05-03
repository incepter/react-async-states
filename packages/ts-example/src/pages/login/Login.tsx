import * as React from "react";
import {FormEvent} from "react";
import {useRunAsyncState} from "react-async-states";
import {currentUserConfig, principalSource} from "./producers";

export default function LoginPage() {
  const run = useRunAsyncState();

  function submit(e: FormEvent) {
    e.preventDefault();
    // @ts-ignore
    const userId = document.forms["login"].elements.userId.value;
    run(currentUserConfig, {id: userId});
    run(principalSource);
  }

  return (
    <form name="login" onSubmit={submit}>
      <label htmlFor="userId">User Id</label>
      <select id="userId" name="userId">
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="3">4</option>
        <option value="3">5</option>
      </select>
      <button type="submit">Go!</button>
    </form>
  )
}
