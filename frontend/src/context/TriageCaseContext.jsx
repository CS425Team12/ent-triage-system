import { createContext, useContext, useState, useCallback } from "react";
import { triageCaseService } from "../api/triageCaseService";
import { STATUS_VALUES } from "../utils/consts";

const TriageCaseContext = createContext();

export function TriageCaseProvider({ children }) {
  const fetchCases = useCallback(async () => {
    const data = await triageCaseService.getAllCases();
    const cases = data.cases;
    return cases;
  }, []);

  const fetchCaseById = useCallback(async (id) => {
    if (!id) return;
    return await triageCaseService.getCaseById(id);
  }, []);

  const updateCase = useCallback(async (id, updates) => {
    if (!id || !updates || Object.keys(updates).length === 0) return;
    const updatedCase = await triageCaseService.updateCase(id, updates);

    return updatedCase;
  }, []);

  const reviewCase = useCallback(async (id, updates) => {
    if (!id || !updates || Object.keys(updates).length === 0) return;
    const updatedCase = await triageCaseService.reviewCase(id, updates);
    return updatedCase;
  }, []);

  const createCase = useCallback(async (caseData) => {
    if (!caseData || Object.keys(caseData).length === 0) return;
    const newCase = await triageCaseService.createCase(caseData);
    return newCase;
  }, []);

  const value = {
    fetchCases,
    fetchCaseById,
    updateCase,
    createCase,
    reviewCase,
  };

  return (
    <TriageCaseContext.Provider value={value}>
      {children}
    </TriageCaseContext.Provider>
  );
}

export function useTriageCases() {
  return useContext(TriageCaseContext);
}
