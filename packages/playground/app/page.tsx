const stateExample = {
  status: "success",
  data: {
    id: 1,
    title: "RAS",
    body: "React Async States is a state management library...",
  },
  dataProps: {
    args: [],
    payload: {},
  },
  timestamp: 1704419529197,
  error: null,
  lastSuccess: null,

  // maybe should be shown like traffic light 🚦
  isError: false,
  isInitial: false,
  isPending: false,
  isSuccess: true,
};

export default function Home() {
  return (
    <div className="flex-1 overflow-auto">
      <pre className="whitespace-pre-wrap p-4">
        {JSON.stringify(stateExample, null, 2)}
      </pre>
    </div>
  );
}
