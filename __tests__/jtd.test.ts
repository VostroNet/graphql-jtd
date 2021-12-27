import {generateJDTFromSchema} from "../src/index";
import demoSchema from "./utils/demo-schema";
import { buildSchema } from 'graphql';


test("jtd schema - root elements test", () => {
  const rootSchema = generateJDTFromSchema(demoSchema);
  expect(rootSchema.optionalProperties?.Query).not.toBeNull();
  expect(rootSchema.optionalProperties?.Mutation).not.toBeNull();
  expect(rootSchema.optionalProperties?.Query.metadata?.name).toEqual("Query")
  expect(rootSchema.optionalProperties?.Query.metadata?.rootElement).toEqual(true)
});

test("jtd schema - arguments test", () => {
  const rootSchema = generateJDTFromSchema(demoSchema);
  const queryTest1 = rootSchema.optionalProperties?.Query.properties?.queryTest1;
  expect(queryTest1?.arguments).not.toBeNull();
    // .definitions?.Person.arguments?.req?.type).toEqual(JtdType.STRING);
});


test("jtd schema - basic types - input and result", async() => {
  const rootSchema = generateJDTFromSchema(demoSchema);
  expect(rootSchema).toBeDefined();
  expect(rootSchema.definitions?.test1Result).toBeDefined();
  expect(rootSchema.definitions?.test1input1).toBeDefined();
});