export function AsyncStateBuilder() {
  let output = {initialValue: null};

  function curryPropOfOutput(prop) {
    return function setPropAndReturnBuilder(value) {
      output[prop] = value;
      return builder;
    }
  }

  const builder = {};
  builder.key = curryPropOfOutput("key");
  builder.producer = curryPropOfOutput("producer");
  builder.initialValue = curryPropOfOutput("initialValue");
  builder.build = function build() {
    return output;
  }
  return builder;
}
