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
import { IJtd, IJtdDict, IJtdRoot, JtdType } from '@vostro/jtd-types';
import { GraphQLSchemaNormalizedConfig } from "graphql/type/schema";

import {generateJDTMinFromSchema as gjmfs} from "./min"

type CustomScalerResolver =  (type: GraphQLType) => JtdType | undefined;

function createType(fieldType: GraphQLType, customScalarResolver: CustomScalerResolver) {
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
  let typeDef = {} as IJtd;
  if (type instanceof GraphQLScalarType) {
    switch (typeName) {
      case "Int":
        typeDef = { type: JtdType.INT32 };
        break;
      case "ID":
      case "String":
        typeDef = { type: JtdType.STRING };
        break;
      case "Float":
        typeDef = { type: JtdType.FLOAT32 };
        break;
      default:
        const customScalarType = customScalarResolver(type);
        if (customScalarType) {
          typeDef = { type: customScalarType };
        } else {
          typeDef = { type: JtdType.UNKNOWN };
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
    typeDef = {elements: typeDef}
  }
  if(required) {
    typeDef.nullable = false;
  } else {
    typeDef.nullable = true;
  }
  // if(obj?.args) {
  //     typeDef.arguments = Object.keys(obj.args).reduce((o, a) => {
  //     if(obj?.args) {
  //       o[a] = createType(obj?.args[a]);
  //     }
  //     return o;
  //   }, {} as IJtdDict);
  // }
  return typeDef;
}

export function createArguments(argMap: GraphQLFieldConfigArgumentMap | undefined, customScalarResolver: CustomScalerResolver) : IJtdDict | undefined {
  if (argMap) {
    const keys = Object.keys(argMap);
    if(keys.length > 0) {
      return keys.reduce((o, k) => {
        o[k] = createType(argMap[k].type, customScalarResolver);
        return o;
      }, {} as IJtdDict);
    }
  }
  return undefined;
}
function objectMapper(obj: GraphQLObjectType | GraphQLInputObjectType, schemaConfig: GraphQLSchemaNormalizedConfig, customScalarResolver: CustomScalerResolver) {
  const objectConfig = obj.toConfig();
  const metadata = {
    name: objectConfig.name,
  } as any;
  if (obj === schemaConfig.query || obj === schemaConfig.mutation || obj === schemaConfig.subscription) {
    metadata.rootElement = true;
  }
  return Object.keys(objectConfig.fields).reduce(
    (o, k) => {
      const field = objectConfig.fields[k];
      const typeDef = createType(field.type, customScalarResolver);
      if (obj instanceof GraphQLObjectType) {
        typeDef.arguments = createArguments((field as GraphQLFieldConfig<any, any,any>).args, customScalarResolver);
      }
      if (!typeDef.nullable) {
        if (!o.properties) {
          o.properties = {};
        }
        o.properties[k] = typeDef;
      } else {
        if (!o.optionalProperties) {
          o.optionalProperties = {};
        }
        o.optionalProperties[k] = typeDef;
      }
      return o;
    },
    {
      metadata,
      properties: {},
      optionalProperties: {},
    } as IJtd
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
        metadata: {
          name: enumType.name,
        },
        enum: enumType.getValues().map((v) => v.name),
      } as IJtd;
    }),
  ];
}


export function generateJTDFromTypes(types: IJtd[], metadata = {}) {
  const definitions = types
    .filter((t) => !t.metadata?.rootElement)
    .reduce((o, t) => {
      if(t.metadata) {
        o[t.metadata?.name] = t;
      }
      return o;
    }, {} as IJtdDict)
  const optionalProperties = types
    .filter((t) => t.metadata?.rootElement)
    .reduce((o, t) => {
      if(t.metadata) {
        o[t.metadata?.name] = t;
      }
      return o;
    }, {} as IJtdDict)
  return {
    metadata,
    definitions,
    optionalProperties
  } as IJtdRoot
}

export function generateJDTFromSchema(schema: GraphQLSchema, customScalarResolver: CustomScalerResolver = () => undefined) {
  const schemaConfig = schema.toConfig();
  const types = createTypes(schemaConfig, customScalarResolver);
  return generateJTDFromTypes(types, {
    mutation: schemaConfig.mutation?.name,
    query: schemaConfig.query?.name,
  });
}
// export function isJTDScalarType(typeDef: IJtd) {
//   switch(typeDef.type) {
//     case JtdType.BOOLEAN:
//     case JtdType.FLOAT32:
//     case JtdType.FLOAT64:
//     case JtdType.INT16:
//     case JtdType.INT32:
//     case JtdType.INT8:
//     case JtdType.STRING:
//     case JtdType.TIMESTAMP:
//     case JtdType.UINT16:
//     case JtdType.UINT32:
//     case JtdType.UINT8:
//       return true;
//   }
//   return false;
// }
export const generateJDTMinFromSchema = gjmfs;