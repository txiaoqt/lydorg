export type DocumentSchemaId =
  | "constitution_and_bylaws"
  | "nyc_yorp_form_b"
  | "yorp_directory_officers_adviser"
  | "yorp_members_good_standing"
  | "pasig_yorp_form_a"
  | "pcydo_yorp_data_request";

export type DocumentExtractionMode = "section_completeness" | "fixed_form" | "table_form" | "spreadsheet_or_table";

export type DocumentFieldStatus =
  | "auto_detected"
  | "needs_review"
  | "missing"
  | "low_confidence"
  | "manually_corrected"
  | "not_applicable";

export type DocumentFieldType =
  | "text"
  | "email"
  | "phone"
  | "date"
  | "address"
  | "id"
  | "number"
  | "url"
  | "textarea"
  | "multiselect"
  | "boolean";

export type DocumentFieldDefinition = {
  key: string;
  label: string;
  section: string;
  fieldType: DocumentFieldType;
  required?: boolean;
  aliases?: string[];
  multiline?: boolean;
  helpText?: string;
  expectedValues?: string[];
};

export type DocumentCheckboxGroupDefinition = {
  key: string;
  label: string;
  section: string;
  options: string[];
  required?: boolean;
  multiSelect?: boolean;
  helpText?: string;
};

export type DocumentTableColumnDefinition = {
  key: string;
  label: string;
  fieldType: DocumentFieldType;
  required?: boolean;
  widthClassName?: string;
};

export type DocumentTableDefinition = {
  key: string;
  label: string;
  section: string;
  columns: DocumentTableColumnDefinition[];
  minimumRows?: number;
  helpText?: string;
};

export type DocumentSchema = {
  id: DocumentSchemaId;
  slotName: string;
  label: string;
  templateId: string;
  extractionMode: DocumentExtractionMode;
  expectedTitlePatterns: RegExp[];
  expectedKeyPhrases: RegExp[];
  sections: string[];
  fields: DocumentFieldDefinition[];
  checkboxGroups?: DocumentCheckboxGroupDefinition[];
  tables?: DocumentTableDefinition[];
  placeholderChecks?: string[];
  requiredArticles?: string[];
};

const makePatterns = (values: string[]) => values.map((value) => new RegExp(value, "i"));

const commonClassificationGroups: DocumentCheckboxGroupDefinition[] = [
  {
    key: "major_classification",
    label: "Major Classification",
    section: "Classification",
    options: ["Youth Organization", "Youth-Serving Organization"],
    required: true,
  },
  {
    key: "sub_classification",
    label: "Sub-Classification",
    section: "Classification",
    options: ["Community-based", "School-based", "Faith-based", "Consortium/Federation"],
    required: true,
  },
];

const commonAdvocacyOptions = [
  "Education",
  "Agriculture",
  "Environment",
  "Health",
  "Peace Building & Security",
  "Governance",
  "Active Citizenship",
  "Global Mobility",
  "Social Inclusion & Equity",
  "Economic Empowerment",
];

export const DOCUMENT_SCHEMAS: Record<DocumentSchemaId, DocumentSchema> = {
  constitution_and_bylaws: {
    id: "constitution_and_bylaws",
    slotName: "Constitution and By-Laws",
    label: "Constitution and By-Laws",
    templateId: "constitution_bylaws_template",
    extractionMode: "section_completeness",
    expectedTitlePatterns: makePatterns(["CONSTITUTION AND BY-LAWS OF", "Article I\\. Name"]),
    expectedKeyPhrases: makePatterns([
      "Article II\\. Vision, Mission and Objectives",
      "Article III\\. Membership",
      "Article IV\\. Officers",
      "Article VIII\\. Amendments",
    ]),
    sections: [
      "Basic Identity",
      "Vision/Mission/Objectives",
      "Membership",
      "Officers",
      "Meetings",
      "Committees",
      "Impeachment",
      "Amendments",
      "Placeholder/Template Warnings",
    ],
    fields: [
      { key: "organization_full_name", label: "Organization Full Name", section: "Basic Identity", fieldType: "text", required: true, aliases: ["full organizational name"] },
      { key: "established_date", label: "Established Date", section: "Basic Identity", fieldType: "date", aliases: ["established"] },
      { key: "adopted_date", label: "Adopted Date", section: "Basic Identity", fieldType: "date", aliases: ["adopted"] },
      { key: "formal_name", label: "Formal Name", section: "Basic Identity", fieldType: "text", required: true, aliases: ["formal name of the organization"] },
      { key: "organization_acronym", label: "Organization Acronym", section: "Basic Identity", fieldType: "text", aliases: ["acronym", "abbreviated name"] },
      { key: "vision_statement", label: "Vision Statement", section: "Vision/Mission/Objectives", fieldType: "textarea", required: true, multiline: true, aliases: ["vision statement"] },
      { key: "mission_statement", label: "Mission Statement", section: "Vision/Mission/Objectives", fieldType: "textarea", required: true, multiline: true, aliases: ["mission statement"] },
      { key: "objectives", label: "Objectives", section: "Vision/Mission/Objectives", fieldType: "textarea", required: true, multiline: true, aliases: ["objectives", "list organizational objectives"] },
      { key: "membership_qualifications", label: "Membership Qualifications", section: "Membership", fieldType: "textarea", required: true, multiline: true, aliases: ["qualifications shall be eligible", "age range", "area of residence", "other qualifications"] },
      { key: "membership_process", label: "Membership Process", section: "Membership", fieldType: "textarea", required: true, multiline: true, aliases: ["become a member", "steps to attain membership"] },
      { key: "adviser_qualifications", label: "Adviser Qualifications", section: "Membership", fieldType: "textarea", multiline: true, aliases: ["advisor", "adviser", "qualifications for adviser"] },
      { key: "officer_structure", label: "Officer Structure", section: "Officers", fieldType: "textarea", required: true, multiline: true, aliases: ["board of officers", "executive committee"] },
      { key: "officer_positions_and_duties", label: "Officer Positions and Duties", section: "Officers", fieldType: "textarea", required: true, multiline: true, aliases: ["corresponding duties", "president", "vice president", "secretary", "treasurer", "auditor", "information officer"] },
      { key: "term_of_office", label: "Term of Office", section: "Officers", fieldType: "text", required: true, aliases: ["term of office", "length of term"] },
      { key: "election_schedule", label: "Election Schedule", section: "Officers", fieldType: "text", required: true, aliases: ["elections shall be conducted", "specify date"] },
      { key: "meeting_frequency", label: "Meeting Frequency", section: "Meetings", fieldType: "text", required: true, aliases: ["regular meeting", "preferred frequency"] },
      { key: "quorum_or_decision_rule", label: "Quorum or Decision Rule", section: "Meetings", fieldType: "textarea", multiline: true, aliases: ["quorum", "postponed until"] },
      { key: "standing_committees", label: "Standing Committees", section: "Committees", fieldType: "textarea", multiline: true, aliases: ["standing committees", "committee", "functions"] },
      { key: "impeachment_grounds", label: "Impeachment Grounds", section: "Impeachment", fieldType: "textarea", multiline: true, aliases: ["impeachment", "grounds"] },
      { key: "amendment_rule", label: "Amendment Rule", section: "Amendments", fieldType: "textarea", required: true, multiline: true, aliases: ["amendments"] },
    ],
    placeholderChecks: [
      "[FULL ORGANIZATIONAL NAME]",
      "[Date]",
      "[Formal Name of the Organization]",
      "[Acronym, abbreviated name, etc.]",
      "[vision statement]",
      "[mission statement]",
      "[List organizational objectives]",
      "[Age range]",
      "[Area of residence]",
      "[Other qualifications]",
      "[Enumerate steps to attain membership]",
      "[Executive Committee/ Board of Officers]",
      "[List positions and corresponding duties/functions]",
      "[enumerate qualifications]",
      "[length of term]",
      "[specify date]",
      "[specify preferred frequency]",
      "[preferred alternate schedule]",
      "[list committee and their functions]",
      "[minimum number]",
    ],
    requiredArticles: [
      "Article I. Name",
      "Article II. Vision, Mission and Objectives",
      "Article III. Membership",
      "Article IV. Officers",
      "Article V. Meetings",
      "Article VI. Standing Committees",
      "Article VII. Impeachment",
      "Article VIII. Amendments",
    ],
  },
  nyc_yorp_form_b: {
    id: "nyc_yorp_form_b",
    slotName: "2026 NYC YORP Registration Form (Form B)",
    label: "2026 NYC YORP Registration Form (Form B)",
    templateId: "form_b_template",
    extractionMode: "fixed_form",
    expectedTitlePatterns: makePatterns(["YOUTH ORGANIZATION REGISTRATION PROGRAM", "ORGANIZATION PROFILE"]),
    expectedKeyPhrases: makePatterns(["BRIEF DESCRIPTION & OBJECTIVES", "LEADERSHIP & MEMBERSHIP INFORMATION", "HOW DID YOU KNOW ABOUT YORP", "UNDERTAKING"]),
    sections: [
      "Organization Profile",
      "Address",
      "Classification",
      "Advocacies",
      "Contact Information",
      "Brief Description and Objectives",
      "Leadership and Adviser Information",
      "YORP Source",
      "Undertaking and Signatures",
    ],
    fields: [
      { key: "organization_name", label: "Organization Name", section: "Organization Profile", fieldType: "text", required: true, aliases: ["name of organization"] },
      { key: "organization_address_building", label: "Building", section: "Address", fieldType: "text", required: true, aliases: ["building"] },
      { key: "organization_address_number", label: "No", section: "Address", fieldType: "text", aliases: ["no"] },
      { key: "organization_address_street", label: "Street", section: "Address", fieldType: "text", required: true, aliases: ["street"] },
      { key: "organization_address_city_municipality", label: "Municipality/City", section: "Address", fieldType: "text", required: true, aliases: ["municipality/city", "city/municipality"] },
      { key: "organization_address_province", label: "Province", section: "Address", fieldType: "text", required: true, aliases: ["province"] },
      { key: "telephone_number", label: "Telephone", section: "Contact Information", fieldType: "phone", aliases: ["telephone"] },
      { key: "cellphone_number", label: "Cellphone", section: "Contact Information", fieldType: "phone", aliases: ["cellphone", "mobile number"] },
      { key: "official_email", label: "Official Organizational Email Address", section: "Contact Information", fieldType: "email", required: true, aliases: ["official organizational email address"] },
      { key: "current_number_of_registered_members", label: "Current Number of Registered Members", section: "Contact Information", fieldType: "number", required: true, aliases: ["current number of registered members"] },
      { key: "date_established", label: "Date of Establishment of Organization", section: "Organization Profile", fieldType: "date", required: true, aliases: ["date of establishment of organization"] },
      { key: "brief_description_and_objectives", label: "Brief Description and Objectives", section: "Brief Description and Objectives", fieldType: "textarea", required: true, multiline: true, aliases: ["brief description & objectives"] },
      { key: "head_family_name", label: "Head Family Name", section: "Leadership and Adviser Information", fieldType: "text", required: true, aliases: ["name of head of organization", "family"] },
      { key: "head_given_name", label: "Head Given Name", section: "Leadership and Adviser Information", fieldType: "text", required: true, aliases: ["given"] },
      { key: "head_middle_name", label: "Head Middle Name", section: "Leadership and Adviser Information", fieldType: "text", aliases: ["middle"] },
      { key: "head_contact_number", label: "Head Contact Number", section: "Leadership and Adviser Information", fieldType: "phone", required: true, aliases: ["contact number / mobile number"] },
      { key: "head_email", label: "Head Email", section: "Leadership and Adviser Information", fieldType: "email", aliases: ["email address"] },
      { key: "adviser_family_name", label: "Adviser Family Name", section: "Leadership and Adviser Information", fieldType: "text", aliases: ["name of adviser"] },
      { key: "adviser_given_name", label: "Adviser Given Name", section: "Leadership and Adviser Information", fieldType: "text" },
      { key: "adviser_middle_name", label: "Adviser Middle Name", section: "Leadership and Adviser Information", fieldType: "text" },
      { key: "adviser_contact_number", label: "Adviser Contact Number", section: "Leadership and Adviser Information", fieldType: "phone" },
      { key: "adviser_email", label: "Adviser Email", section: "Leadership and Adviser Information", fieldType: "email" },
      { key: "referred_by", label: "Referred By", section: "YORP Source", fieldType: "text", aliases: ["referred by"] },
      { key: "others_specify", label: "Others Specify", section: "YORP Source", fieldType: "text", aliases: ["others, please identify"] },
      { key: "president_head_signature_present", label: "President / Head Signature Present", section: "Undertaking and Signatures", fieldType: "boolean", required: true, aliases: ["president / head of organization"] },
      { key: "adviser_signature_present", label: "Adviser Signature Present", section: "Undertaking and Signatures", fieldType: "boolean", required: true, aliases: ["adviser"] },
      { key: "date_of_filing", label: "Date of Filing", section: "Undertaking and Signatures", fieldType: "date", required: true, aliases: ["date of filing"] },
    ],
    checkboxGroups: [
      ...commonClassificationGroups,
      {
        key: "advocacies",
        label: "Advocacies",
        section: "Advocacies",
        options: commonAdvocacyOptions,
        required: true,
        multiSelect: true,
      },
      {
        key: "organizational_level",
        label: "Organizational Level",
        section: "Classification",
        options: [
          "National Organization",
          "Inter-Regional Organization",
          "Regional Organization",
          "Provincial Organization",
          "City/Municipal Organization",
        ],
        required: true,
      },
      {
        key: "how_did_you_know_about_yorp",
        label: "How Did You Know About YORP?",
        section: "YORP Source",
        options: [
          "Newspaper / Radio / Television",
          "NYC Website",
          "NYC Communication",
          "Referred by: NYC Official / Personnel",
          "Others",
        ],
        required: true,
        multiSelect: true,
      },
    ],
  },
  yorp_directory_officers_adviser: {
    id: "yorp_directory_officers_adviser",
    slotName: "2026 YORP Directory of Officers and Adviser",
    label: "2026 YORP Directory of Officers and Adviser",
    templateId: "officers_adviser_template",
    extractionMode: "table_form",
    expectedTitlePatterns: makePatterns(["Directory of Officers and Advisers", "POSITION", "IDENTIFICATION CARD"]),
    expectedKeyPhrases: makePatterns(["ADVISER/S", "GENDER IDENTITY", "CONTACT NUMBER"]),
    sections: ["Officers Table", "Adviser/s", "Identification Card Attachment Check", "Validation Warnings"],
    fields: [
      { key: "adviser_name", label: "Adviser Name", section: "Adviser/s", fieldType: "text", aliases: ["name"] },
      { key: "adviser_position", label: "Adviser Position", section: "Adviser/s", fieldType: "text", aliases: ["position"] },
      { key: "id_front_present", label: "Identification Card Front Present", section: "Identification Card Attachment Check", fieldType: "boolean", required: true, aliases: ["identification card (front)"] },
      { key: "id_back_present", label: "Identification Card Back Present", section: "Identification Card Attachment Check", fieldType: "boolean", required: true, aliases: ["identification card (back)"] },
    ],
    tables: [
      {
        key: "officers",
        label: "Officers",
        section: "Officers Table",
        minimumRows: 1,
        columns: [
          { key: "position", label: "Position", fieldType: "text", required: true },
          { key: "name", label: "Name", fieldType: "text", required: true },
          { key: "age", label: "Age", fieldType: "number", required: true },
          { key: "sex", label: "Sex", fieldType: "text", required: true },
          { key: "gender_identity", label: "Gender Identity", fieldType: "text", required: true },
          { key: "address", label: "Address", fieldType: "address", required: true },
          { key: "email", label: "Email", fieldType: "email" },
          { key: "contact_number", label: "Contact Number", fieldType: "phone", required: true },
        ],
      },
    ],
  },
  yorp_members_good_standing: {
    id: "yorp_members_good_standing",
    slotName: "2026 YORP List of Members in Good Standing",
    label: "2026 YORP List of Members in Good Standing",
    templateId: "members_good_standing_template",
    extractionMode: "spreadsheet_or_table",
    expectedTitlePatterns: makePatterns(["List of Members in Good Standing", "Surname", "Date of Birth"]),
    expectedKeyPhrases: makePatterns(["ORGANIZATION NAME", "CONTACT NUMBER", "at least 10 members"]),
    sections: ["Organization Information", "Members Table", "Row Validation", "Duplicate Warnings", "Minimum Member Count Check"],
    fields: [
      { key: "organization_name", label: "Organization Name", section: "Organization Information", fieldType: "text", aliases: ["organization name"] },
      { key: "organization_address", label: "Organization Address", section: "Organization Information", fieldType: "address", aliases: ["organization address"] },
    ],
    tables: [
      {
        key: "members",
        label: "Members",
        section: "Members Table",
        minimumRows: 10,
        columns: [
          { key: "surname", label: "Surname", fieldType: "text", required: true },
          { key: "first_name", label: "First Name", fieldType: "text", required: true },
          { key: "middle_initial", label: "Middle Initial", fieldType: "text" },
          { key: "age", label: "Age", fieldType: "number", required: true },
          { key: "date_of_birth", label: "Date of Birth", fieldType: "date", required: true },
          { key: "address", label: "Address", fieldType: "address", required: true },
          { key: "contact_number", label: "Contact Number", fieldType: "phone", required: true },
        ],
      },
    ],
  },
  pasig_yorp_form_a: {
    id: "pasig_yorp_form_a",
    slotName: "Pasig City YORP Registration Form (Form A)",
    label: "Pasig City YORP Registration Form (Form A)",
    templateId: "form_a_template",
    extractionMode: "fixed_form",
    expectedTitlePatterns: makePatterns(["PASIG CITY YOUTH ORGANIZATION REGISTRATION PROGRAM FORM", "TYPE OF REGISTRATION"]),
    expectedKeyPhrases: makePatterns(["ORGANIZATION PROFILE", "ORGANIZATION HEAD INFORMATION", "SUBMISSION SLIP"]),
    sections: [
      "Registration Information",
      "Organization Profile",
      "Classification",
      "Contact Information",
      "Organization Head Information",
      "Consent and Signature",
      "Submission Slip",
    ],
    fields: [
      { key: "organization_name", label: "Name of Organization", section: "Organization Profile", fieldType: "text", required: true, aliases: ["name of organization"] },
      { key: "organization_address_building", label: "Building", section: "Organization Profile", fieldType: "text", required: true, aliases: ["building"] },
      { key: "organization_address_number", label: "No", section: "Organization Profile", fieldType: "text", aliases: ["no"] },
      { key: "organization_address_street", label: "Street", section: "Organization Profile", fieldType: "text", required: true, aliases: ["street"] },
      { key: "organization_address_barangay", label: "Barangay", section: "Organization Profile", fieldType: "text", required: true, aliases: ["barangay"] },
      { key: "organization_address_district", label: "District", section: "Organization Profile", fieldType: "text", aliases: ["district"] },
      { key: "organization_address_city", label: "Municipality/City", section: "Organization Profile", fieldType: "text", required: true, aliases: ["municipality/city"] },
      { key: "organization_contact_number", label: "Telephone/Cellphone", section: "Contact Information", fieldType: "phone", required: true, aliases: ["telephone/cellphone", "organizational contact number"] },
      { key: "official_organizational_email", label: "Official Organizational Email Address", section: "Contact Information", fieldType: "email", required: true, aliases: ["official organizational email address"] },
      { key: "organization_website", label: "Organization Website", section: "Contact Information", fieldType: "url", aliases: ["organization website"] },
      { key: "organization_facebook_page", label: "Organization Facebook Account or Page", section: "Contact Information", fieldType: "url", aliases: ["organization facebook account or page"] },
      { key: "current_number_of_registered_members", label: "Current Number of Registered Members", section: "Contact Information", fieldType: "number", required: true, aliases: ["current number of registered members"] },
      { key: "date_established", label: "Date of Establishment of Organization", section: "Organization Profile", fieldType: "date", required: true, aliases: ["date of establishment of organization"] },
      { key: "head_family_name", label: "Head Family Name", section: "Organization Head Information", fieldType: "text", required: true, aliases: ["name of head of organization", "family"] },
      { key: "head_given_name", label: "Head Given Name", section: "Organization Head Information", fieldType: "text", required: true, aliases: ["given"] },
      { key: "head_middle_name", label: "Head Middle Name", section: "Organization Head Information", fieldType: "text", aliases: ["middle"] },
      { key: "head_date_of_birth", label: "Head Date of Birth", section: "Organization Head Information", fieldType: "date", aliases: ["date of birth"] },
      { key: "head_contact_number", label: "Head Contact Number", section: "Organization Head Information", fieldType: "phone", required: true, aliases: ["contact number / mobile number"] },
      { key: "head_facebook_link", label: "Head Facebook Account Name or Link", section: "Organization Head Information", fieldType: "url", aliases: ["facebook account name or link"] },
      { key: "head_email", label: "Head Email Address", section: "Organization Head Information", fieldType: "email", aliases: ["email address"] },
      { key: "head_address", label: "Head Address", section: "Organization Head Information", fieldType: "address", aliases: ["address"] },
      { key: "signature_over_printed_name", label: "Signature over Printed Name", section: "Consent and Signature", fieldType: "boolean", required: true, aliases: ["signature over printed name"] },
      { key: "signature_date", label: "Signature Date", section: "Consent and Signature", fieldType: "date", required: true, aliases: ["date"] },
      { key: "submission_slip_date_received", label: "Submission Slip Date Received", section: "Submission Slip", fieldType: "date", aliases: ["date received"] },
      { key: "submission_slip_received_from", label: "Submission Slip Received From", section: "Submission Slip", fieldType: "text", aliases: ["received from"] },
      { key: "submission_slip_receiving_office", label: "Submission Slip Receiving Office", section: "Submission Slip", fieldType: "text", aliases: ["receiving location or office"] },
      { key: "submission_slip_name_of_organization", label: "Submission Slip Organization Name", section: "Submission Slip", fieldType: "text", aliases: ["name of organization"] },
      { key: "submission_received_by", label: "Submission Received By", section: "Submission Slip", fieldType: "text", aliases: ["received by"] },
      { key: "submission_date_received", label: "Submission Date Received", section: "Submission Slip", fieldType: "date", aliases: ["date received"] },
    ],
    checkboxGroups: [
      {
        key: "type_of_registration",
        label: "Type of Registration",
        section: "Registration Information",
        options: ["New Registration", "Renewal"],
        required: true,
      },
      ...commonClassificationGroups,
      {
        key: "primary_advocacy",
        label: "Primary Advocacy",
        section: "Classification",
        options: commonAdvocacyOptions,
        required: true,
        multiSelect: true,
      },
      {
        key: "organizational_level",
        label: "Organizational Level",
        section: "Classification",
        options: [
          "City/Municipal Organization",
          "National Organization",
          "Inter-Regional Organization",
          "Regional Organization",
          "Provincial Organization",
        ],
        required: true,
      },
      {
        key: "documents_submitted",
        label: "Documents Submitted",
        section: "Submission Slip",
        options: [
          "NYC YORP Registration Form",
          "Directory of Officers and Adviser",
          "List of Members",
          "Certificate of Endorsement",
          "Identification Card of Officers",
          "Constitution and By Laws",
        ],
        multiSelect: true,
      },
    ],
  },
  pcydo_yorp_data_request: {
    id: "pcydo_yorp_data_request",
    slotName: "PCYDO YORP Data Request Form",
    label: "PCYDO YORP Data Request Form",
    templateId: "data_request_template",
    extractionMode: "fixed_form",
    expectedTitlePatterns: makePatterns(["PASIG CITY YOUTH ORGANIZATION REGISTRATION PROGRAM \\(YORP\\) DATA REQUEST FORM", "A\\. REQUESTOR INFORMATION"]),
    expectedKeyPhrases: makePatterns(["B\\. NATURE OF REQUEST", "C\\. PURPOSE OF REQUEST", "D\\. PREFFERED WAY OF FEEDBACK", "E\\. DECLARATION"]),
    sections: ["Requestor Information", "Nature of Request", "Purpose of Request", "Preferred Feedback", "Declaration and Signature"],
    fields: [
      { key: "requestor_last_name", label: "Requestor Last Name", section: "Requestor Information", fieldType: "text", required: true, aliases: ["last name"] },
      { key: "requestor_first_name", label: "Requestor First Name", section: "Requestor Information", fieldType: "text", required: true, aliases: ["first name"] },
      { key: "requestor_middle_name", label: "Requestor Middle Name", section: "Requestor Information", fieldType: "text", aliases: ["middle name"] },
      { key: "requestor_organization", label: "Organization", section: "Requestor Information", fieldType: "text", required: true, aliases: ["organization*"] },
      { key: "requestor_position_designation", label: "Position/Designation", section: "Requestor Information", fieldType: "text", aliases: ["position/designation"] },
      { key: "requestor_complete_address", label: "Complete Address", section: "Requestor Information", fieldType: "address", required: true, aliases: ["complete address"] },
      { key: "requestor_contact_number", label: "Contact Number", section: "Requestor Information", fieldType: "phone", required: true, aliases: ["contact number*"] },
      { key: "requestor_email_address", label: "E-mail Address", section: "Requestor Information", fieldType: "email", required: true, aliases: ["e-mail address*"] },
      { key: "requested_data_list_of_yorp_location", label: "List of YORP in", section: "Nature of Request", fieldType: "text", aliases: ["list of yorp in"] },
      { key: "requested_data_head_name", label: "Name of Head of Organization", section: "Nature of Request", fieldType: "text", aliases: ["name of head of organization"] },
      { key: "requested_data_organization_address", label: "Organization Address", section: "Nature of Request", fieldType: "address", aliases: ["address if the organization", "address of the organization"] },
      { key: "requested_data_organization_email", label: "Organization Email", section: "Nature of Request", fieldType: "email", aliases: ["e-mail address of the organization"] },
      { key: "requested_data_organization_contact_number", label: "Organization Contact Number", section: "Nature of Request", fieldType: "phone", aliases: ["contact number of the organization"] },
      { key: "requested_data_others", label: "Others Specify", section: "Nature of Request", fieldType: "text", aliases: ["others, please specify"] },
      { key: "purpose_of_request", label: "Purpose of Request", section: "Purpose of Request", fieldType: "textarea", required: true, multiline: true, aliases: ["c. purpose of request"] },
      { key: "preferred_feedback_other", label: "Preferred Feedback Other", section: "Preferred Feedback", fieldType: "text", aliases: ["other (please specify)"] },
      { key: "signature_over_printed_name", label: "Signature over Printed Name", section: "Declaration and Signature", fieldType: "boolean", required: true, aliases: ["signature over printed name"] },
      { key: "signature_date", label: "Signature Date", section: "Declaration and Signature", fieldType: "date", required: true, aliases: ["date"] },
    ],
    checkboxGroups: [
      {
        key: "nature_of_request",
        label: "Nature of Request",
        section: "Nature of Request",
        options: [
          "List of YORP in",
          "Name of head of organization",
          "Address of the organization",
          "E-mail Address of the organization",
          "Contact Number of the Organization",
          "Others, please specify",
        ],
        required: true,
        multiSelect: true,
      },
      {
        key: "preferred_feedback_method",
        label: "Preferred Way of Feedback",
        section: "Preferred Feedback",
        options: [
          "In writing to the correspondence address",
          "Via electronic format",
          "Collect the information in person",
          "Other",
        ],
        required: true,
      },
    ],
  },
};

export const DOCUMENT_SCHEMA_BY_SLOT_NAME = Object.values(DOCUMENT_SCHEMAS).reduce<Record<string, DocumentSchema>>((lookup, schema) => {
  lookup[schema.slotName] = schema;
  return lookup;
}, {});

export const getDocumentSchemaForSlot = (slotName: string) => DOCUMENT_SCHEMA_BY_SLOT_NAME[slotName] ?? null;
