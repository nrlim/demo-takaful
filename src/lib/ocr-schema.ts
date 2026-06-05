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
    pages: {
      type: "array",
      description: "Page-level OCR extraction. Group extracted information by source PDF page for side-by-side audit review.",
      items: {
        type: "object",
        properties: {
          page_number: { type: "number" },
          page_label: { type: ["string", "null"], description: "Optional page title or section label if visible." },
          page_type: { type: ["string", "null"], description: "Detected page section, for example applicant data, beneficiaries, health declaration, payment, signature." },
          extracted_fields: {
            type: "object",
            description: "Fields found on this page only. Use the same field names as the document-level schema where possible."
          },
          confidence_score: { type: ["number", "null"], description: "Page-level extraction confidence from 0 to 1." },
          readability_score: { type: ["number", "null"], description: "Page-level readability score from 0 to 1 based on scan clarity and text legibility." },
          issues: { type: "array", items: { type: "string" } }
        },
        required: ["page_number", "extracted_fields"]
      }
    },
    ocr_feedback: {
      type: "object",
      description: "Feedback from AI regarding OCR extraction quality, page count, readability, usability, and document clarity.",
      properties: {
        confidence_score: { type: "number", description: "Overall extraction confidence from 0 to 1." },
        readability_score: { type: ["number", "null"], description: "Overall readability score from 0 to 1 based on scan clarity and text legibility." },
        usability_score: { type: ["number", "null"], description: "Overall usability score from 0 to 1 for operational review readiness." },
        total_pages: { type: ["number", "null"], description: "Total PDF pages detected." },
        is_blurry: { type: "boolean" },
        missing_fields: { type: "array", items: { type: "string" } },
        page_feedback: {
          type: "array",
          items: {
            type: "object",
            properties: {
              page_number: { type: "number" },
              confidence_score: { type: ["number", "null"] },
              readability_score: { type: ["number", "null"] },
              issues: { type: "array", items: { type: "string" } }
            },
            required: ["page_number"]
          }
        },
        extraction_notes: { type: "string" }
      },
      required: ["confidence_score", "is_blurry", "total_pages"]
    }
  },
  required: ["document_type", "personal_data", "ocr_feedback"]
} as const;

export function normalizeSnaptextResult(response: unknown): unknown {
  if (!response || typeof response !== "object") {
    return response;
  }

  const record = response as Record<string, unknown>;
  return record.result ?? record.data ?? record.output ?? record.extraction ?? response;
}
