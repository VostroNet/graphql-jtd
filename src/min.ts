import logger from "./utils/logger";
import {GraphQLFieldConfig, GraphQLFieldConfigArgumentMap, GraphQLInputObjectType} from "graphql";
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLType,
  GraphQLScalarType,
  GraphQLEnumType,
  GraphQLList,
} from "graphql";
import { IJtdMin, IJtdMinDict, IJtdMinRoot, JtdMinType } from "@vostro/jtd-types";
import { GraphQLSchemaNormalizedConfig } from "graphql/type/schema";

type CustomScalerResolver =  (type: GraphQLType) => JtdMinType | undefined;


function createType(fieldType: GraphQLType, customScalarResolver: CustomScalerResolver) : IJtdMin {
  // const fieldType = !(field as GraphQLFieldConfig<any, any, any>).type ? field as GraphQLType : (field as GraphQLFieldConfig<any, any, any>).type;
  const required = fieldType instanceof GraphQLNonNull;
  let type: GraphQLType;
  if (required) {
    type = (fieldType as GraphQLNonNull<GraphQLType>).ofType;
  } else {
    type = fieldType;
  }
  let isList = false;
  if (type instanceof GraphQLList) {
    isList = true;
    type = type.ofType;
  }
  let typeName = type.toString();
  let typeDef = {} as IJtdMin;
  if (type instanceof GraphQLScalarType) {
    switch (typeName) {
      case "Int":
        typeDef = { t: JtdMinType.INT32 };
        break;
      case "ID":
      case "String":
        typeDef = { t: JtdMinType.STRING };
        break;
      case "Float":
        typeDef = { t: JtdMinType.FLOAT32 };
        break;
      default:
        const customScalarType = customScalarResolver(type);
        if (customScalarType) {
          typeDef = { t: customScalarType };
        } else {
          typeDef = { t: JtdMinType.UNKNOWN };
          logger.err(`no scalar type found for ${typeName}`);
        }
        break;
    }
  } else if (type instanceof GraphQLObjectType) {
    typeDef = { ref: type.name };
  } else if (type instanceof GraphQLInputObjectType) {
    typeDef = { ref: type.name };
  } else if (type instanceof GraphQLEnumType) {
    typeDef = { ref: type.name };
  // } else if (type instanceof GraphQLList) {
  //   throw "TODO: List in list - needs implementing";
  } else {
    logger.err(`unknown gql type ${typeName}`);
  }
  if (isList) {
    typeDef = {el: typeDef}
  }
  if (required) {
    typeDef.rq = true;
  }
  // if(obj?.args) {
  //     typeDef.arguments = Object.keys(obj.args).reduce((o, a) => {
  //     if(obj?.args) {
  //       o[a] = createType(obj?.args[a]);
  //     }
  //     return o;
  //   }, {} as IJtdMinDict);
  // }
  return typeDef;
}

export function createArguments(argMap: GraphQLFieldConfigArgumentMap | undefined, customScalarResolver: CustomScalerResolver) : IJtdMinDict | undefined {
  if (argMap) {
    const keys = Object.keys(argMap);
    if(keys.length > 0) {
      return keys.reduce((o, k) => {
        o[k] = createType(argMap[k].type, customScalarResolver);
        return o;
      }, {} as IJtdMinDict);
    }
  }
  return undefined;
}
function objectMapper(obj: GraphQLObjectType | GraphQLInputObjectType, schemaConfig: GraphQLSchemaNormalizedConfig, customScalarResolver: CustomScalerResolver) {
  const objectConfig = obj.toConfig();
  const metadata = {
    n: objectConfig.name,
  } as any;
  if (obj === schemaConfig.query || obj === schemaConfig.mutation || obj === schemaConfig.subscription) {
    metadata.re = true;
  }
  return Object.keys(objectConfig.fields).reduce(
    (o, k) => {
      const field = objectConfig.fields[k];
      const typeDef = createType(field.type, customScalarResolver);
      if (obj instanceof GraphQLObjectType) {
        typeDef.args = createArguments((field as GraphQLFieldConfig<any, any,any>).args, customScalarResolver);
      }
      if (!o.p) {
        o.p = {};
      }
      o.p[k] = typeDef;
      return o;
    },
    {
      md: metadata,
      p: {},
    } as IJtdMin
  );
}

export function createTypes(schemaConfig: GraphQLSchemaNormalizedConfig, customScalarResolver: CustomScalerResolver) {
  const enums = schemaConfig.types.filter(
    (f) => f instanceof GraphQLEnumType && f.name.indexOf("__") !== 0
  ) as GraphQLEnumType[];
  const objects = schemaConfig.types.filter(
    (f) => f instanceof GraphQLObjectType && f.name.indexOf("__") !== 0
  ) as GraphQLObjectType[];
  const inputs = schemaConfig.types.filter(
    (f) => f instanceof GraphQLInputObjectType && f.name.indexOf("__") !== 0
  ) as GraphQLInputObjectType[]

  return [
    ...inputs.map((i) => objectMapper(i, schemaConfig, customScalarResolver)),
    ...objects.map((o) => objectMapper(o, schemaConfig, customScalarResolver)),
    ...enums.map((enumType) => {
      return {
        md: {
          n: enumType.name,
        },
        enum: enumType.getValues().map((v) => v.name),
      } as IJtdMin;
    }),
  ];
}


export function generateJTDMinFromTypes(types: IJtdMin[], metadata = {}) {
  const definitions = types
    .filter((t) => !t.md?.re) // filter rootElement
    .reduce((o, t) => {
      if(t.md) {
        o[t.md?.n] = t;
      }
      return o;
    }, {} as IJtdMinDict)
  const optionalProperties = types
    .filter((t) => t.md?.re)
    .reduce((o, t) => {
      if(t.md) {
        o[t.md?.n] = t;
      }
      return o;
    }, {} as IJtdMinDict)
  return {
    md: metadata,
    def: definitions,
    p: optionalProperties,
  } as IJtdMinRoot
}

export function generateJDTMinFromSchema(schema: GraphQLSchema, customScalarResolver: CustomScalerResolver = () => undefined) {
  const schemaConfig = schema.toConfig();
  const types = createTypes(schemaConfig, customScalarResolver);
  return generateJTDMinFromTypes(types, {
    mutation: schemaConfig.mutation?.name,
    query: schemaConfig.query?.name,
  });
}


// export function isJTDScalarType(typeDef: IJtdMin) {
//   switch(typeDef.type) {
//     case JtdMinType.BOOLEAN:
//     case JtdMinType.FLOAT32:
//     case JtdMinType.FLOAT64:
//     case JtdMinType.INT16:
//     case JtdMinType.INT32:
//     case JtdMinType.INT8:
//     case JtdMinType.STRING:
//     case JtdMinType.TIMESTAMP:
//     case JtdMinType.UINT16:
//     case JtdMinType.UINT32:
//     case JtdMinType.UINT8:
//       return true;
//   }
//   return false;
// }
