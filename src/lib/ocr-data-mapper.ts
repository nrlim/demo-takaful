import type { JsonValue } from "@prisma/client/runtime/client";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function removeEmptyValues(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length > 0) {
        result[key] = value;
      }
    } else if (isRecord(value)) {
      const cleaned = removeEmptyValues(value);
      if (Object.keys(cleaned).length > 0) {
        result[key] = cleaned;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

export interface OcrMappedDocument {
  documentInfo: Record<string, unknown>;
  personalData: Record<string, unknown>;
  address: Record<string, unknown>;
  employment: Record<string, unknown>;
  productDetails: Record<string, unknown>;
  manfaatTakaful: Record<string, unknown>;
  paymentMethod: Record<string, unknown>;
  beneficiaries: Array<Record<string, unknown>>;
  healthHistory: Array<Record<string, unknown>>;
  familyHealthHistory: Array<Record<string, unknown>>;
  fees: Array<Record<string, unknown>>;
  agent: Record<string, unknown>;
  issuer: Record<string, unknown>;
  raw: Record<string, unknown>;
}

export function mapOcrData(data: JsonValue, response?: JsonValue | null): OcrMappedDocument {
  const recordData = isRecord(data) ? data : {};
  const recordResponse = isRecord(response) ? response : {};

  // Find merged data - it could be in data, or response.data
  let mergedData = recordData;
  if (recordResponse.data && isRecord(recordResponse.data)) {
    mergedData = { ...recordResponse.data, ...recordData };
  }

  const cleanData = removeEmptyValues(mergedData);

  const documentInfo: Record<string, unknown> = {};
  const docKeys = ["document_type", "document_id", "serial_number", "date", "location"];
  for (const key of docKeys) {
    if (cleanData[key] !== undefined) {
      documentInfo[key] = cleanData[key];
    }
  }

  return {
    documentInfo,
    personalData: isRecord(cleanData.personal_data) ? cleanData.personal_data : {},
    address: isRecord(cleanData.address) ? cleanData.address : {},
    employment: isRecord(cleanData.employment) ? cleanData.employment : {},
    productDetails: isRecord(cleanData.product_details) ? cleanData.product_details : {},
    manfaatTakaful: isRecord(cleanData.manfaat_takaful) ? cleanData.manfaat_takaful : {},
    paymentMethod: isRecord(cleanData.payment_method) ? cleanData.payment_method : {},
    beneficiaries: Array.isArray(cleanData.beneficiaries) ? cleanData.beneficiaries.filter(isRecord) : [],
    healthHistory: Array.isArray(cleanData.health_history) ? cleanData.health_history.filter(isRecord) : [],
    familyHealthHistory: Array.isArray(cleanData.family_health_history) ? cleanData.family_health_history.filter(isRecord) : [],
    fees: Array.isArray(cleanData.fees) ? cleanData.fees.filter(isRecord) : [],
    agent: isRecord(cleanData.agent) ? cleanData.agent : {},
    issuer: isRecord(cleanData.issuer) ? cleanData.issuer : {},
    raw: cleanData,
  };
}
