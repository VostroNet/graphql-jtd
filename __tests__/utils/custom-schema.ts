import { GraphQLSchema, GraphQLObjectType, GraphQLString } from "graphql";
import GQLTDate from "@vostro/graphql-types/lib/date";
export default new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: () => ({
      hello: {
        type: GraphQLString,
        resolve: () => 'Hello world!'
      },
      date: {
        type: GQLTDate,
        resolve: () => new Date()
      }
    })
  })
});
