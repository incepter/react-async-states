import React from "react";
import { useLocation } from "react-router-dom";
import { AsyncStateProvider } from 'react-async-states';
import { DOMAIN_USER_PROMISES } from "../domain/users/promises";
import { parseSearch } from "../shared/utils";

const staticPromises = Object.freeze({...DOMAIN_USER_PROMISES});

export default function DemoProvider({children}) {
  const location = useLocation();
  const payload = React.useMemo(function getPayload() {
    return {
      queryString: parseSearch(location.search)
    };
  }, [location]);

  return (
    <AsyncStateProvider payload={payload} initialAsyncStates={staticPromises}>
      {children}
    </AsyncStateProvider>
  );
}
