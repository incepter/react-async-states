import React from "react";
import { useLocation } from "react-router-dom";
import { AsyncStateProvider } from 'react-async-states';
import { DOMAIN_USER_PRODUCERS } from "../domain/users/producers";
import { parseSearch } from "../shared/utils";

const staticProducers = Object.freeze({...DOMAIN_USER_PRODUCERS});

export default function DemoProvider({children}) {
  const location = useLocation();
  const payload = React.useMemo(function getPayload() {
    return {
      queryString: parseSearch(location.search)
    };
  }, [location]);

  return (
    <AsyncStateProvider payload={payload} initialStates={staticProducers}>
      {children}
    </AsyncStateProvider>
  );
}
