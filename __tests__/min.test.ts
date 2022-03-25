import {generateJDTMinFromSchema} from "../src/index";
import demoSchema from "./utils/demo-schema";
import { buildSchema } from 'graphql';


test("jtd schema - root elements test", () => {
  const rootSchema = generateJDTMinFromSchema(demoSchema);
  expect(rootSchema.p?.Query).not.toBeNull();
  expect(rootSchema.p?.Mutation).not.toBeNull();
  expect(rootSchema.p?.Query.md?.n).toEqual("Query")
  expect(rootSchema.p?.Query.md?.re).toEqual(true)
});

test("jtd schema - arguments test", () => {
  const rootSchema = generateJDTMinFromSchema(demoSchema);
  const queryTest1 = rootSchema.p?.Query.p?.queryTest1;
  expect(queryTest1?.args).not.toBeNull();
    // .definitions?.Person.arguments?.req?.type).toEqual(JtdType.STRING);
});


test("jtd schema - basic types - input and result", async() => {
  const rootSchema = generateJDTMinFromSchema(demoSchema);
  expect(rootSchema).toBeDefined();
  expect(rootSchema.def?.test1Result).toBeDefined();
  expect(rootSchema.def?.test1input1).toBeDefined();
});