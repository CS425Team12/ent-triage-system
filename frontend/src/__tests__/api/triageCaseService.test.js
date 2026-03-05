import { triageCaseService } from "../../api/triageCaseService";
import apiClient from "../../api/axios";

jest.mock("../../api/axios");

describe("TriageCaseService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllCases", () => {
    it("should fetch all triage cases", async () => {
      const mockCases = [
        {
          caseID: "case-uuid-1",
          patientID: "patient-uuid-1",
          firstName: "John",
          lastName: "Doe",
          dateCreated: "2025-05-01T10:00:00Z",
          status: "unreviewed",
          AIUrgency: "Urgent",
          AIConfidence: 0.92,
          AISummary: "Patient reports severe ear pain.",
          overrideUrgency: null,
          overrideSummary: null,
          clinicianNotes: null,
          reviewReason: null,
          reviewTimestamp: null,
          reviewedBy: null,
          scheduledDate: null,
          previousUrgency: null,
        },
        {
          caseID: "case-uuid-2",
          patientID: "patient-uuid-2",
          firstName: "Jane",
          lastName: "Smith",
          dateCreated: "2025-05-02T09:00:00Z",
          status: "reviewed",
          AIUrgency: "Routine",
          AIConfidence: 0.75,
          AISummary: "Patient reports mild hearing difficulty.",
          overrideUrgency: null,
          overrideSummary: null,
          clinicianNotes: "Routine follow-up scheduled.",
          reviewReason: "No immediate concern",
          reviewTimestamp: "2025-05-02T11:00:00Z",
          reviewedBy: "user-uuid-1",
          scheduledDate: "2025-06-01T09:00:00Z",
          previousUrgency: null,
        },
      ];
      apiClient.get.mockResolvedValue({ data: { cases: mockCases, count: 2 } });

      const result = await triageCaseService.getAllCases();

      expect(apiClient.get).toHaveBeenCalledWith("triage-cases/");
      expect(result).toEqual({ cases: mockCases, count: 2 });
    });

    it("should return an empty list if no cases exist", async () => {
      apiClient.get.mockResolvedValue({ data: { cases: [], count: 0 } });

      const result = await triageCaseService.getAllCases();

      expect(apiClient.get).toHaveBeenCalledWith("triage-cases/");
      expect(result).toEqual({ cases: [], count: 0 });
    });
  });

  describe("getCaseById", () => {
    it("should fetch a triage case by ID", async () => {
      const mockCase = {
        caseID: "case-uuid-1",
        patientID: "patient-uuid-1",
        firstName: "John",
        lastName: "Doe",
        dateCreated: "2025-05-01T10:00:00Z",
        status: "unreviewed",
        AIUrgency: "Urgent",
        AIConfidence: 0.92,
        AISummary: "Patient reports severe ear pain.",
        overrideUrgency: null,
        overrideSummary: null,
        clinicianNotes: null,
        reviewReason: null,
        reviewTimestamp: null,
        reviewedBy: null,
        scheduledDate: null,
        previousUrgency: null,
      };
      apiClient.get.mockResolvedValue({ data: mockCase });

      const result = await triageCaseService.getCaseById("case-uuid-1");

      expect(apiClient.get).toHaveBeenCalledWith("/triage-cases/case-uuid-1");
      expect(result).toEqual(mockCase);
    });
  });

  describe("createCase", () => {
    it("should create a new triage case with required fields", async () => {
      const caseData = {
        patientID: "patient-uuid-1",
        transcript: "Patient called and reported ear pain for 3 days.",
      };
      const mockResponse = {
        caseID: "case-uuid-1",
        ...caseData,
        status: "unreviewed",
        dateCreated: "2025-05-01T10:00:00Z",
        AIUrgency: null,
        AIConfidence: null,
        AISummary: null,
      };
      apiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await triageCaseService.createCase(caseData);

      expect(apiClient.post).toHaveBeenCalledWith("/triage-cases", caseData);
      expect(result).toEqual(mockResponse);
    });

    it("should create a triage case with AI fields populated", async () => {
      const caseData = {
        patientID: "patient-uuid-2",
        transcript: "Patient reports hearing loss in left ear.",
        AIUrgency: "Urgent",
        AIConfidence: 0.85,
        AISummary: "Patient experiencing unilateral hearing loss.",
      };
      apiClient.post.mockResolvedValue({ data: { caseID: "case-uuid-2", ...caseData } });

      await triageCaseService.createCase(caseData);

      expect(apiClient.post).toHaveBeenCalledWith("/triage-cases", caseData);
    });
  });

  describe("updateCase", () => {
    it("should update clinician notes on a triage case", async () => {
      const updateData = { clinicianNotes: "Patient advised to come in for evaluation." };
      const mockResponse = {
        caseID: "case-uuid-1",
        clinicianNotes: "Patient advised to come in for evaluation.",
        status: "unreviewed",
      };
      apiClient.patch.mockResolvedValue({ data: mockResponse });

      const result = await triageCaseService.updateCase("case-uuid-1", updateData);

      expect(apiClient.patch).toHaveBeenCalledWith("/triage-cases/case-uuid-1", updateData);
      expect(result).toEqual(mockResponse);
    });

    it("should update override urgency and summary on a triage case", async () => {
      const updateData = {
        overrideUrgency: "CRITICAL",
        overrideSummary: "Clinician assessed as critical based on additional context.",
      };
      const mockResponse = { caseID: "case-uuid-1", ...updateData };
      apiClient.patch.mockResolvedValue({ data: mockResponse });

      const result = await triageCaseService.updateCase("case-uuid-1", updateData);

      expect(apiClient.patch).toHaveBeenCalledWith("/triage-cases/case-uuid-1", updateData);
      expect(result).toEqual(mockResponse);
    });

    it("should update patient fields on a triage case", async () => {
      const updateData = {
        firstName: "Jonathan",
        contactInfo: "555-9999",
        insuranceInfo: "BlueCross",
        verified: true,
      };
      const mockResponse = { caseID: "case-uuid-1", ...updateData };
      apiClient.patch.mockResolvedValue({ data: mockResponse });

      const result = await triageCaseService.updateCase("case-uuid-1", updateData);

      expect(apiClient.patch).toHaveBeenCalledWith("/triage-cases/case-uuid-1", updateData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe("reviewCase", () => {
    it("should mark a case as reviewed with a reason and scheduled date", async () => {
      const reviewData = {
        reviewReason: "Assessed and follow-up scheduled.",
        scheduledDate: "2025-06-01T09:00:00Z",
      };
      const mockResponse = {
        caseID: "case-uuid-1",
        status: "reviewed",
        reviewReason: "Assessed and follow-up scheduled.",
        scheduledDate: "2025-06-01T09:00:00Z",
        reviewTimestamp: "2025-05-10T14:00:00Z",
        reviewedBy: "user-uuid-1",
      };
      apiClient.patch.mockResolvedValue({ data: mockResponse });

      const result = await triageCaseService.reviewCase("case-uuid-1", reviewData);

      expect(apiClient.patch).toHaveBeenCalledWith("/triage-cases/case-uuid-1/review", reviewData);
      expect(result).toEqual(mockResponse);
    });

    it("should mark a case as reviewed with only a reason and no scheduled date", async () => {
      const reviewData = { reviewReason: "No follow-up required." };
      const mockResponse = {
        caseID: "case-uuid-2",
        status: "reviewed",
        reviewReason: "No follow-up required.",
        scheduledDate: null,
        reviewTimestamp: "2025-05-10T15:00:00Z",
        reviewedBy: "user-uuid-2",
      };
      apiClient.patch.mockResolvedValue({ data: mockResponse });

      const result = await triageCaseService.reviewCase("case-uuid-2", reviewData);

      expect(apiClient.patch).toHaveBeenCalledWith("/triage-cases/case-uuid-2/review", reviewData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getCaseChangelog", () => {
    it("should fetch the changelog for a triage case", async () => {
      const mockChangelog = [
        {
          id: "changelog-uuid-1",
          caseID: "case-uuid-1",
          changedAt: "2025-05-02T10:00:00Z",
          changedBy: "user-uuid-1",
          fieldName: "overrideUrgency",
          oldValue: "LOW",
          newValue: "CRITICAL",
        },
        {
          id: "changelog-uuid-2",
          caseID: "case-uuid-1",
          changedAt: "2025-05-01T09:00:00Z",
          changedBy: "user-uuid-2",
          fieldName: "clinicianNotes",
          oldValue: null,
          newValue: "Patient advised to come in for evaluation.",
        },
      ];
      apiClient.get.mockResolvedValue({ data: mockChangelog });

      const result = await triageCaseService.getCaseChangelog("case-uuid-1");

      expect(apiClient.get).toHaveBeenCalledWith("/triage-cases/case-uuid-1/changelog");
      expect(result).toEqual(mockChangelog);
    });

    it("should return an empty array if no changelog entries exist", async () => {
      apiClient.get.mockResolvedValue({ data: [] });

      const result = await triageCaseService.getCaseChangelog("case-uuid-99");

      expect(apiClient.get).toHaveBeenCalledWith("/triage-cases/case-uuid-99/changelog");
      expect(result).toEqual([]);
    });

    it("should correctly reflect a patient field change in the changelog", async () => {
      const mockChangelog = [
        {
          id: "changelog-uuid-3",
          caseID: "case-uuid-1",
          changedAt: "2025-05-03T08:00:00Z",
          changedBy: "user-uuid-1",
          fieldName: "contactInfo",
          oldValue: "555-1234",
          newValue: "555-9999",
        },
      ];
      apiClient.get.mockResolvedValue({ data: mockChangelog });

      const result = await triageCaseService.getCaseChangelog("case-uuid-1");

      expect(result[0].fieldName).toBe("contactInfo");
      expect(result[0].oldValue).toBe("555-1234");
      expect(result[0].newValue).toBe("555-9999");
    });
  });
});