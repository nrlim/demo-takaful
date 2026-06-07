export const takafulApplicationOcrSchema = {
  type: "object",
  properties: {
    document_type: {
      type: "string",
      description: "Insurance document type, for example spaj, underwriting, claim, policy, medical, premium, endorsement, or finance.",
    },
    document_id: { type: ["string", "null"] },
    serial_number: { type: ["string", "null"] },
    date: { type: ["string", "null"], description: "Document date in YYYY-MM-DD if available." },
    location: { type: ["string", "null"] },
    personal_data: {
      type: "object",
      properties: {
        name: { type: ["string", "null"] },
        id_number: { type: ["string", "number", "null"] },
        gender: { type: ["string", "null"] },
        birth_place: { type: ["string", "null"] },
        birth_date: { type: ["string", "null"] },
        marital_status: { type: ["string", "null"] },
        religion: { type: ["string", "null"] },
        education: { type: ["string", "null"] },
        citizenship: { type: ["string", "null"] },
        mother_name: { type: ["string", "null"] },
        height: { type: ["number", "null"] },
        weight: { type: ["number", "null"] },
        is_smoker: { type: ["boolean", "null"] }
      }
    },
    address: {
      type: "object",
      properties: {
        street: { type: ["string", "null"] },
        rt_rw: { type: ["string", "null"] },
        district: { type: ["string", "null"] },
        city: { type: ["string", "null"] },
        zip: { type: ["string", "number", "null"] },
        phone: { type: ["string", "number", "null"] },
        mobile: { type: ["string", "number", "null"] }
      }
    },
    employment: {
      type: "object",
      properties: {
        occupation: { type: ["string", "null"] },
        job_class: { type: ["string", "null"] },
        company_name: { type: ["string", "null"] },
        job_description: { type: ["string", "null"] }
      }
    },
    product_details: {
      type: "object",
      properties: {
        product_name: { type: ["string", "null"] },
        currency: { type: ["string", "null"] },
        policy_period_years: { type: ["number", "null"] }
      }
    },
    manfaat_takaful: {
      type: "object",
      properties: {
        amount: { type: ["number", "null"] },
        takaful_al_khairat_individu: { type: ["boolean", "null"] },
        takaful_al_khairat_plus_fhp: { type: ["boolean", "null"] },
        takaful_dana_pendidikan_fulnadi: { type: ["boolean", "null"] },
        takaful_edupro: { type: ["boolean", "null"] },
        takaful_kecelakaan_diri_individu: { type: ["boolean", "null"] }
      }
    },
    payment_method: {
      type: "object",
      properties: {
        bulanan: { type: ["boolean", "null"] },
        semesteran: { type: ["boolean", "null"] },
        tahunan: { type: ["boolean", "null"] },
        sekaligus: { type: ["boolean", "null"] }
      }
    },
    beneficiaries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          no: { type: ["number", "null"] },
          name: { type: ["string", "null"] },
          gender: { type: ["string", "null"] },
          birth_date: { type: ["string", "null"] },
          relationship: { type: ["string", "null"] }
        }
      }
    },
    health_history: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          yes: { type: ["boolean", "null"] },
          no: { type: ["boolean", "null"] },
          details: { type: ["string", "null"] }
        }
      }
    },
    family_health_history: {
      type: "array",
      items: {
        type: "object",
        properties: {
          relation: { type: ["string", "null"] },
          age: { type: ["number", "null"] },
          health_condition: { type: ["string", "number", "null"] },
          cause_of_death: { type: ["string", "null"] },
          year_of_death: { type: ["string", "number", "null"] },
          age_at_death: { type: ["string", "number", "null"] }
        }
      }
    },
    fees: {
      type: "array",
      items: {
        type: "object",
        properties: {
          no: { type: ["number", "string", "null"] },
          description: { type: ["string", "null"] },
          amount: { type: ["number", "null"] },
          currency: { type: ["string", "null"] },
          percentage: { type: ["number", "null"] }
        }
      }
    },
    agent: {
      type: "object",
      properties: {
        name: { type: ["string", "null"] },
        agent_id: { type: ["string", "number", "null"] },
        has_signature: { type: ["boolean", "null"] }
      }
    },
    issuer: {
      type: "object",
      properties: {
        name: { type: ["string", "null"] },
        email: { type: ["string", "null"] },
        phone: { type: ["string", "null"] },
        website: { type: ["string", "null"] }
      }
    },
    pagesData: {
      type: "array",
      description: "Primary Snaptext page-level OCR output. Return one item per scanned PDF page in the same order as the PDF. Do not return technical metadata or OCR feedback here.",
      items: {
        type: "object",
        properties: {
          pageNumber: { type: "number", description: "Source PDF page number, starting from 1." },
          pageLabel: { type: ["string", "null"], description: "Short visible page title or section label if available." },
          extractedText: { type: ["string", "null"], description: "Clean readable text captured from this PDF page only." },
          extractedFields: {
            type: "object",
            description: "Structured fields found on this PDF page only. Keep field names consistent with the document-level schema, for example personal_data, address, beneficiaries, health_history, payment_method, fees, agent, issuer."
          },
          confidenceScore: { type: ["number", "null"], description: "Page-level extraction confidence from 0 to 1." }
        },
        required: ["pageNumber", "extractedFields"]
      }
    }
  },
  required: ["pagesData"]
} as const;

export function normalizeSnaptextResult(response: unknown): unknown {
  if (!response || typeof response !== "object") {
    return response;
  }

  const record = response as Record<string, unknown>;
  const result = record.result ?? record.data ?? record.output ?? record.extraction;
  const pagesData = record.pagesData ?? record.pages_data ?? record.pageData;

  if (result && typeof result === "object" && !Array.isArray(result) && pagesData !== undefined) {
    return { pagesData, ...(result as Record<string, unknown>) };
  }

  if (result !== undefined) {
    return result;
  }

  if (pagesData !== undefined) {
    return { pagesData };
  }

  return response;
}
