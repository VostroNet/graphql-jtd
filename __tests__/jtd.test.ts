import {generateJDTFromSchema} from "../src/index";
import demoSchema from "./utils/demo-schema";


test("jtd schema - basic test", () => {
  const rootSchema = generateJDTFromSchema(demoSchema);
  expect(rootSchema.optionalProperties?.Query).not.toBeNull();
  expect(rootSchema.optionalProperties?.Mutation).not.toBeNull();
  expect(rootSchema.optionalProperties?.Query.metadata?.name).toEqual("Query")
  expect(rootSchema.optionalProperties?.Query.metadata?.rootElement).toEqual(true)
});

test("jtd schema - arguments test", () => {
  const rootSchema = generateJDTFromSchema(demoSchema);
  const pocket = rootSchema.optionalProperties?.Query.properties?.pocket;
  expect(pocket?.arguments).not.toBeNull();
    // .definitions?.Person.arguments?.req?.type).toEqual(JtdType.STRING);
});

