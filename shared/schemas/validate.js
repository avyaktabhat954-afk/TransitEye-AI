/**
 * Zero-dependency JSON Schema validator for TransitEye shared contracts.
 * Validates canonical schemas and example payloads without extra npm packages.
 */

const fs = require("fs");
const path = require("path");

const schemasDir = __dirname;
const examplesDir = path.join(schemasDir, "examples");

// Load schemas
const commonSchema = JSON.parse(
  fs.readFileSync(path.join(schemasDir, "common.schema.json"), "utf8")
);
const detectionSchema = JSON.parse(
  fs.readFileSync(path.join(schemasDir, "detection.schema.json"), "utf8")
);
const vehicleDensitySchema = JSON.parse(
  fs.readFileSync(path.join(schemasDir, "vehicle_density.schema.json"), "utf8")
);
const incidentSchema = JSON.parse(
  fs.readFileSync(path.join(schemasDir, "incident.schema.json"), "utf8")
);

function resolveRef(ref) {
  if (ref.startsWith("common.schema.json#/definitions/")) {
    const defKey = ref.replace("common.schema.json#/definitions/", "");
    if (commonSchema.definitions && commonSchema.definitions[defKey]) {
      return commonSchema.definitions[defKey];
    }
  }
  throw new Error(`Cannot resolve ref: ${ref}`);
}

function validateField(value, fieldSchema, fieldPath) {
  const errors = [];

  if (fieldSchema.$ref) {
    fieldSchema = resolveRef(fieldSchema.$ref);
  }

  const expectedTypes = Array.isArray(fieldSchema.type)
    ? fieldSchema.type
    : [fieldSchema.type];

  // Null check
  if (value === null) {
    if (!expectedTypes.includes("null")) {
      errors.push(`${fieldPath}: expected type [${expectedTypes.join(", ")}], got null`);
    }
    return errors;
  }

  // Type check
  const actualType = Array.isArray(value)
    ? "array"
    : typeof value === "number"
    ? Number.isInteger(value)
      ? "integer"
      : "number"
    : typeof value;

  const typeMatches = expectedTypes.some((t) => {
    if (t === "number" && (actualType === "number" || actualType === "integer")) return true;
    if (t === "integer" && actualType === "integer") return true;
    return t === actualType;
  });

  if (!typeMatches) {
    errors.push(
      `${fieldPath}: expected type [${expectedTypes.join(", ")}], got ${actualType} (${JSON.stringify(value)})`
    );
    return errors;
  }

  // Enum check
  if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
    errors.push(
      `${fieldPath}: value "${value}" is not one of allowed enum values: [${fieldSchema.enum.join(", ")}]`
    );
  }

  // Number bounds
  if (actualType === "number" || actualType === "integer") {
    if (fieldSchema.minimum !== undefined && value < fieldSchema.minimum) {
      errors.push(`${fieldPath}: value ${value} is less than minimum ${fieldSchema.minimum}`);
    }
    if (fieldSchema.maximum !== undefined && value > fieldSchema.maximum) {
      errors.push(`${fieldPath}: value ${value} is greater than maximum ${fieldSchema.maximum}`);
    }
  }

  // String bounds & format
  if (actualType === "string") {
    if (fieldSchema.minLength !== undefined && value.length < fieldSchema.minLength) {
      errors.push(`${fieldPath}: length ${value.length} is less than minLength ${fieldSchema.minLength}`);
    }
    if (fieldSchema.format === "date-time") {
      const parsed = Date.parse(value);
      if (isNaN(parsed)) {
        errors.push(`${fieldPath}: string "${value}" is not a valid ISO 8601 date-time`);
      }
    }
  }

  // Object checks
  if (actualType === "object") {
    errors.push(...validateObject(value, fieldSchema, fieldPath));
  }

  return errors;
}

function validateObject(data, schema, parentPath = "") {
  const errors = [];
  const props = schema.properties || {};
  const required = schema.required || [];

  for (const reqKey of required) {
    if (data[reqKey] === undefined) {
      errors.push(`${parentPath ? parentPath + "." : ""}${reqKey}: missing required field`);
    }
  }

  if (schema.additionalProperties === false) {
    for (const key of Object.keys(data)) {
      if (!props[key]) {
        errors.push(`${parentPath ? parentPath + "." : ""}${key}: unrecognized additional property`);
      }
    }
  } else if (typeof schema.additionalProperties === "object") {
    for (const [key, val] of Object.entries(data)) {
      errors.push(...validateField(val, schema.additionalProperties, `${parentPath ? parentPath + "." : ""}${key}`));
    }
  }

  for (const [propKey, propVal] of Object.entries(data)) {
    if (props[propKey]) {
      const currentPath = parentPath ? `${parentPath}.${propKey}` : propKey;
      errors.push(...validateField(propVal, props[propKey], currentPath));
    }
  }

  return errors;
}

// Test matrices
const testCases = [
  {
    name: "1. Road Defect Example",
    file: "road_defect.json",
    schema: detectionSchema,
  },
  {
    name: "2. Waterlogging Example",
    file: "waterlogging.json",
    schema: detectionSchema,
  },
  {
    name: "3. VRU / Safety Example",
    file: "vru_risk.json",
    schema: detectionSchema,
  },
  {
    name: "4. Vehicle Density Example",
    file: "vehicle_density.json",
    schema: vehicleDensitySchema,
  },
  {
    name: "5. ANPR / Incident Example",
    file: "incident_anpr.json",
    schema: incidentSchema,
  },
];

console.log("=== TransitEye Shared Contract Validator ===");
console.log("Validating canonical examples against JSON Schemas...\n");

let totalFailed = 0;

for (const tc of testCases) {
  const filePath = path.join(examplesDir, tc.file);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const errors = validateObject(data, tc.schema);

  if (errors.length === 0) {
    console.log(`[PASS] ${tc.name} (${tc.file})`);
  } else {
    totalFailed++;
    console.error(`[FAIL] ${tc.name} (${tc.file})`);
    errors.forEach((e) => console.error(`       - ${e}`));
  }
}

// Negative test: verify validation properly rejects invalid data
console.log("\nRunning negative validation assertions...");
const invalidDetection = {
  id: "bad-001",
  type: "unknown_category",
  confidence: 1.5,
  location: { latitude: 95.0, longitude: 77.0 },
};
const negErrors = validateObject(invalidDetection, detectionSchema);
if (negErrors.length >= 4) {
  console.log(`[PASS] Negative test correctly rejected ${negErrors.length} invalid attributes.`);
} else {
  totalFailed++;
  console.error(`[FAIL] Negative test expected >= 4 errors, got ${negErrors.length}`);
}

console.log("\n===========================================");
if (totalFailed === 0) {
  console.log("All schemas and example payloads successfully validated!");
  process.exit(0);
} else {
  console.error(`Validation failed with ${totalFailed} errors.`);
  process.exit(1);
}
