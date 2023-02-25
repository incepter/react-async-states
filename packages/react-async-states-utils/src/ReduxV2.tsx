import {createSource, UseAsyncState} from "async-states/src";
import {useAsyncState} from "react-async-states/src";

function create(target, propName, propValue) {
  Object.defineProperty(target, propName, {
    get() {
      return propValue;
    },
  });
}

type Page<T> = {}
type User = {
  username: string,
}

type Api<T> = {
  add(t: T): T,
  update(t: T): T,
  delete(t: T): number,
  search(query: string): Page<T>,
  findById(id: unknown): T | undefined,
}

function createApi<T>(): Api<T> {
}

type Application<A> = {
  [prop in keyof A]: Api<A[prop]>
}


type ApiHooks<T> = {
  [prop in keyof Api<T>]: typeof useAsyncState<T>
}

type ApplicationHooks<A> = {
  [prop in keyof A]: ApiHooks<A[prop]>
}

type MyApp<A> = {
  app: Application<A>,
  hooks: ApplicationHooks<A>,
  define<T extends keyof A, M extends keyof Api<A[T]>>(
    key: T,
    method: M,
    impl: Api<A[T]>[M]
  ): MyApp<A>,
}

interface AppInterface {
  users: User,
  Hello: "World",
  counter: number,
}

function createMyApplication<A>(): MyApp<A> {

  function define<T extends keyof A, M extends keyof Api<A[T]>>(
    key: T,
    method: M,
    impl: Api<A[T]>[M]
  ): MyApp<A> {

  }

  return {
    define: inject,
  }
}

let app = createMyApplication<AppInterface>()

app.define("users", "delete", () => 1)
  .define("Hello", "add", (a) => "World")
  .define("users", "search", (q) => {})
  .define("users", "add", function (u) {

  })

app.app.users.findById(1);
app.app.Hello.search("?start=now")
app.app.counter.add(1)





















type Bank = {}
type Weather = {}

type OurApp = {
  user: User,
  hello: "World!",
  weather: Weather,
  counter: number,
  banks: Bank
}




let myApp = createMyApplication<OurApp>()
myApp.app.banks.find

function Compo() {
  let result = use(myApp.define(""));



}






















