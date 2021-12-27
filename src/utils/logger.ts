import debug from "debug";

const log = debug("graphql-jtd:log");
const warn = debug("graphql-jtd:warn");
const err = debug("graphql-jtd:error");
debug.enable("*")

export default {
  log,
  warn,
  err
};

// export function log(formatter: any,...args: any[]) {
//   logger.apply(logger, [formatter, ...args]);
// }