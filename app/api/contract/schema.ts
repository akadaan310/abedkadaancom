/**
 * A minimal Zod → JSON Schema projection, sufficient for publishing the proposal contract.
 *
 * Written rather than pulled in as a dependency because only the subset this contract
 * actually uses needs to be correct, and an agent reading it deserves a schema that
 * matches the validator exactly rather than one produced by a more general converter.
 */
import { z } from 'zod';

type JsonSchema = Record<string, unknown>;

export function zodToJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  const def = schema._def as { typeName?: string; [k: string]: unknown };

  switch (def.typeName) {
    case 'ZodObject': {
      const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToJsonSchema(value as z.ZodTypeAny);
        if (!(value as z.ZodTypeAny).isOptional()) required.push(key);
      }
      return { type: 'object', properties, ...(required.length > 0 ? { required } : {}), additionalProperties: false };
    }
    case 'ZodString': return { type: 'string' };
    case 'ZodNumber': return { type: 'number' };
    case 'ZodBoolean': return { type: 'boolean' };
    case 'ZodLiteral': return { const: (def as { value: unknown }).value };
    case 'ZodEnum': return { type: 'string', enum: (def as { values: readonly string[] }).values };
    case 'ZodArray': return { type: 'array', items: zodToJsonSchema((def as { type: z.ZodTypeAny }).type) };
    case 'ZodTuple':
      return { type: 'array', prefixItems: (def as { items: z.ZodTypeAny[] }).items.map(zodToJsonSchema) };
    case 'ZodUnion':
    case 'ZodDiscriminatedUnion': {
      const options = (def as { options: z.ZodTypeAny[] | Map<string, z.ZodTypeAny> }).options;
      const list = Array.isArray(options) ? options : [...options.values()];
      return { anyOf: list.map(zodToJsonSchema) };
    }
    case 'ZodDefault':
      return {
        ...zodToJsonSchema((def as { innerType: z.ZodTypeAny }).innerType),
        default: (def as { defaultValue: () => unknown }).defaultValue(),
      };
    case 'ZodOptional':
    case 'ZodNullable':
      return zodToJsonSchema((def as { innerType: z.ZodTypeAny }).innerType);
    case 'ZodRecord': return { type: 'object', additionalProperties: true };
    default: return {};
  }
}
