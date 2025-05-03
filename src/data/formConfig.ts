// src/data/formConfig.ts
import { FormConfig } from '@/types/procurementForm';

export const formConfig: FormConfig = {
  formTitle: "Procurement Application Submission",
  sections: [
    {
      id: "applicationDocs",
      title: "Application Documents",
      icon: "document",
      type: 'standard',
      fields: [
        {
          id: "applicationForm",
          label: "Application Form",
          type: "file",
          accept: ".pdf,.doc,.docx",
          maxSizeMB: 10,
          required: true,
          percentageScore: 25,
          canDuplicate: true
        },
        {
          id: "proposedPrice",
          label: "Proposed Price",
          type: "number",
          placeholder: "Enter proposed price",
          currency: "€",
          min: 0,
          step: 0.01,
          required: true,
          percentageScore: 30
        },
        {
          id: "attachedContracts",
          label: "Attached Contracts",
          type: "multi-file",
          accept: ".pdf,.doc,.docx",
          maxSizeMB: 10,
          required: true,
          percentageScore: 25,
          canDuplicate: true
        },
        {
          id: "payrolls",
          label: "Number of Payrolls",
          type: "number",
          placeholder: "Enter number of payrolls",
          min: 0,
          required: true,
          percentageScore: 20
        }
      ]
    },
    {
      id: "businessInfo",
      title: "Business Information",
      icon: "business",
      type: 'standard',
      fields: [
        {
          id: "businessRegistrationNumber",
          label: "Business Registration Number",
          type: "text",
          placeholder: "Enter business registration number",
          required: true,
          triggersConditional: true,
          percentageScore: 20
        }
      ],
      conditionalFields: [
        {
          id: "businessLicense",
          label: "Business License",
          type: "file",
          accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png",
          required: true,
          percentageScore: 15,
          canDuplicate: true
        },
        {
          id: "noPendingLawsuitCert",
          label: "Certificate of No Pending Lawsuit",
          type: "file",
          accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png",
          required: true,
          percentageScore: 15
        },
        {
          id: "goodStandingCert",
          label: "Certificate of Good Standing",
          type: "file",
          accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png",
          required: true,
          percentageScore: 15
        },
        {
          id: "taxClearance",
          label: "Tax Clearance",
          type: "file",
          accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png",
          required: true,
          percentageScore: 15
        },
        {
          id: "financialStatements",
          label: "Financial Statements (Last Year)",
          type: "file",
          accept: ".pdf,.doc,.docx,.xls,.xlsx",
          required: true,
          percentageScore: 15,
          canDuplicate: true
        },
        {
          id: "outsourcedContracts",
          label: "Contracts of Outsourced Staff (Optional)",
          type: "multi-file",
          accept: ".pdf,.doc,.docx",
          required: false,
          percentageScore: 5,
          canDuplicate: true
        }
      ]
    },
    {
      id: "staff",
      title: "Staff Members",
      icon: "users",
      type: "table",
      addLabel: "Add Staff Member",
      minRows: 1,
      columns: [
        {id: "fullName", label: "Full Name", type: "text", placeholder: "Full Name", required: true},
        {id: "profession", label: "Profession", type: "text", placeholder: "Profession", required: true},
        {id: "yearsExperience", label: "Years of Experience", type: "number", placeholder: "Years", min: 0, required: true},
        {id: "cv", label: "CV", type: "file", accept: ".pdf,.doc,.docx", required: true},
        {id: "diplomas", label: "Diplomas", type: "file", accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png", required: true},
        {id: "credentials", label: "Credentials", type: "file", accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png", required: true}
      ]
    },
    {
      id: "additionalDocs",
      title: "Additional Documents",
      icon: "document",
      type: 'standard',
      fields: [
        {
          id: "workplan",
          label: "Work Plan",
          type: "file",
          accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx",
          required: true,
          percentageScore: 60,
          canDuplicate: true
        },
        {
          id: "conflictDisclosure",
          label: "Disclosure of Conflict of Interest (Optional)",
          type: "file",
          accept: ".pdf,.doc,.docx",
          required: false,
          percentageScore: 40,
          canDuplicate: true
        }
      ]
    }
  ],
  submitLabel: "Submit Application"
};
